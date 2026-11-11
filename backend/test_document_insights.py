import json
import gc
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch

import main


class DeleteDocumentTests(unittest.TestCase):
    def test_delete_removes_chunks_and_insight_row_only_for_target(self):
        client = main.chromadb.EphemeralClient()
        collection = client.create_collection("delete_test")
        collection.add(ids=["doc-a-0", "doc-b-0"], documents=["a", "b"], metadatas=[
            {"document_id": "doc-a", "source": "a.pdf"},
            {"document_id": "doc-b", "source": "b.pdf"},
        ])
        database = Path(main.BASE_DIR) / f"test-delete-{uuid.uuid4().hex}.sqlite3"
        try:
            with patch.object(main, "collection", collection), patch.object(main, "INSIGHTS_DB", database):
                main.init_insights_db()
                main.save_document_insight("doc-a", "a.pdf", 1, False, 1, summary={"summary": "a"}, cards=[{"q": "q"}])
                main.save_document_insight("doc-b", "b.pdf", 1, False, 1)
                result = main.delete_document("doc-a")
                self.assertEqual(result, {"success": True, "document_id": "doc-a", "deleted_chunks": 1})
                self.assertEqual(collection.get(where={"document_id": "doc-a"}, include=[])["ids"], [])
                self.assertIsNone(main.get_insight_row("doc-a"))
                self.assertEqual(collection.get(where={"document_id": "doc-b"}, include=[])["ids"], ["doc-b-0"])
                self.assertIsNotNone(main.get_insight_row("doc-b"))
                with self.assertRaises(main.HTTPException) as missing:
                    main.delete_document("doc-a")
                self.assertEqual(missing.exception.status_code, 404)
        finally:
            gc.collect()
            database.unlink(missing_ok=True)


class DocumentInsightTests(unittest.TestCase):
    def test_query_flags_length_truncation(self):
        class Completion:
            def __init__(self, reason):
                self.choices = [type("Choice", (), {"finish_reason": reason, "message": type("Message", (), {"content": "Answer"})()})()]
                self.usage = type("Usage", (), {"total_tokens": 42})()
        for reason, truncated in (("length", True), ("stop", False)):
            with self.subTest(reason=reason), patch.object(main, "require_groq"), \
                 patch.object(main.collection, "count", return_value=1), \
                 patch.object(main.collection, "query", return_value={"documents": [["notes"]], "metadatas": [[{"source": "a.pdf", "page": 1}]], "distances": [[0.1]]}), \
                 patch.object(main, "groq_chat", return_value=Completion(reason)):
                result = main.query_notes(main.QueryRequest(question="Q"))
            self.assertEqual(result["truncated"], truncated)
            self.assertEqual("cut off" in result["answer"], truncated)

    def test_overview_uses_one_context_and_is_cached_in_sqlite(self):
        entries = [
            {"page": 1, "text": "Universal quantifier ∀x P(x).", "index": 0},
            {"page": 2, "text": "Existential quantifier ∃x P(x).", "index": 1},
        ]
        model_response = {
            "summary": "Quantifiers describe logical scope.",
            "key_topics": ["Logic"],
            "important_concepts": ["∀", "∃"],
            "topic_summaries": [{
                "topic": "Quantifiers", "summary": "Universal and existential scope.",
                "key_points": ["∀ means for every"], "example": "∀x P(x)",
                "pages": [1, 2, 3, 99, True],
            }],
        }
        database = Path(main.BASE_DIR) / f"test-insights-{uuid.uuid4().hex}.sqlite3"
        try:
            with patch.object(main, "INSIGHTS_DB", database), \
                 patch.object(main, "get_document_chunks", return_value=entries), \
                 patch.object(main, "call_json_model", return_value=model_response) as model:
                main.init_insights_db()
                main.save_document_insight("doc-1", "Quantifiers.pdf", 3, False, 2)

                first = main.document_overview("doc-1")
                second = main.document_overview("doc-1")

                self.assertEqual(first, second)
                self.assertEqual(first["title"], "Quantifiers")
                self.assertEqual(first["summary"], model_response["summary"])
                self.assertEqual(first["processing_status"], "partial")
                self.assertEqual(first["excerpt"]["page"], 1)
                self.assertEqual(first["topic_summaries"][0]["pages"], [1, 2])
                model.assert_called_once()

                row = main.get_insight_row("doc-1")
                self.assertEqual(json.loads(row["summary_json"]), first)
        finally:
            gc.collect()
            database.unlink(missing_ok=True)

    def test_summary_marks_all_extracted_pages_complete(self):
        entries = [
            {"page": 1, "text": "First page content", "index": 0},
            {"page": 2, "text": "Second page content", "index": 1},
        ]
        response = {"summary": "Both pages summarized."}
        with patch.object(main, "call_json_model", return_value=response) as model:
            summary = main.generate_document_summary("doc-2", "Complete.pdf", 2, False, entries)
        self.assertEqual(summary["processing_status"], "complete")
        self.assertEqual(summary["extracted_pages"], 2)
        self.assertEqual(model.call_count, 1)
        prompt = model.call_args.args[1]
        self.assertIn("[Page 1]", prompt)
        self.assertIn("[Page 2]", prompt)

    def test_cached_overview_is_returned_without_regeneration(self):
        cached = {"document_id": "doc-cache", "title": "Notes", "summary": "Cached overview"}
        row = {"summary_json": json.dumps(cached)}
        with patch.object(main, "get_insight_row", return_value=row), \
             patch.object(main, "get_document_chunks", return_value=[{"page": 1, "text": "source", "index": 0}]), \
             patch.object(main, "call_json_model") as generate:
            self.assertEqual(main.document_overview("doc-cache"), cached)
        generate.assert_not_called()

    def test_malformed_summary_model_output_is_not_returned_as_content(self):
        with patch.object(main, "call_json_model", return_value={
            "summary": "", "key_topics": [], "important_concepts": [],
        }):
            with self.assertRaises(ValueError):
                main.generate_document_summary(
                    "doc-3", "Empty.pdf", 1, False,
                    [{"page": 1, "text": "text", "index": 0}],
                )

    def test_object_flashcards_are_validated_deduplicated_and_cached(self):
        row = {
            "filename": "Quantifiers.pdf", "page_count": 1, "ocr_used": 0,
            "extracted_pages": 1, "cards_json": None,
        }
        model_cards = {"cards": [
            {"q": "What does ∀ mean?", "a": "For every element."},
            {"q": "What does ∀ mean?", "a": "Duplicate."},
            {"q": "  ", "a": "Blank question."},
            {"q": "What does ∃ mean?", "a": "There exists an element."},
            {"q": "Invalid answer", "a": 12},
            {"q": "Oversized", "a": "x" * 1801},
        ]}
        with patch.object(main, "get_document_chunks", return_value=[
            {"page": 1, "text": "Universal ∀x; existential ∃x", "index": 0},
        ]), patch.object(main, "get_insight_row", return_value=row), \
             patch.object(main, "call_json_model", return_value=model_cards) as model, \
             patch.object(main, "save_document_insight") as save:
            result = main.document_flashcards("doc-1")

        self.assertEqual(result, {"document_id": "doc-1", "cards": [
            {"question": "What does ∀ mean?", "answer": "For every element."},
            {"question": "What does ∃ mean?", "answer": "There exists an element."},
        ]})
        self.assertTrue(model.call_args.kwargs["allow_array"])
        save.assert_called_once()

    def test_bare_array_flashcards_are_accepted_and_capped_at_ten(self):
        row = {
            "filename": "Notes.pdf", "page_count": 1, "ocr_used": 0,
            "extracted_pages": 1, "cards_json": None,
        }
        cards = [{"q": f"Question {index}", "a": f"Answer {index}"} for index in range(12)]
        with patch.object(main, "get_document_chunks", return_value=[
            {"page": 1, "text": "A document with study content.", "index": 0},
        ]), patch.object(main, "get_insight_row", return_value=row), \
             patch.object(main, "call_json_model", return_value=cards), \
             patch.object(main, "save_document_insight"):
            result = main.document_flashcards("doc-array")
        self.assertEqual(len(result["cards"]), 10)
        self.assertEqual(result["cards"][0]["question"], "Question 0")

    def test_invalid_or_empty_flashcard_result_returns_502(self):
        row = {
            "filename": "Notes.pdf", "page_count": 1, "ocr_used": 0,
            "extracted_pages": 1, "cards_json": None,
        }
        with patch.object(main, "get_document_chunks", return_value=[
            {"page": 1, "text": "A document with study content.", "index": 0},
        ]), patch.object(main, "get_insight_row", return_value=row), \
             patch.object(main, "call_json_model", return_value={"cards": [
                 {"q": "", "a": "No question"}, {"q": "Bad answer", "a": 42},
             ]}):
            with self.assertRaises(main.HTTPException) as failed:
                main.document_flashcards("doc-empty")
        self.assertEqual(failed.exception.status_code, 502)

    def test_flashcard_api_reports_missing_document_and_model_errors(self):
        with patch.object(main, "get_document_chunks", return_value=[]):
            with self.assertRaises(main.HTTPException) as missing:
                main.document_flashcards("missing")
        self.assertEqual(missing.exception.status_code, 404)

        row = {
            "filename": "Notes.pdf", "page_count": 1, "ocr_used": 0,
            "extracted_pages": 1, "cards_json": None,
        }
        with patch.object(main, "get_document_chunks", return_value=[
            {"page": 1, "text": "text", "index": 0},
        ]), patch.object(main, "get_insight_row", return_value=row), \
             patch.object(main, "call_json_model", side_effect=ValueError("bad JSON")):
            with self.assertRaises(main.HTTPException) as failed:
                main.document_flashcards("doc-model-error")
        self.assertEqual(failed.exception.status_code, 502)


if __name__ == "__main__":
    unittest.main()
