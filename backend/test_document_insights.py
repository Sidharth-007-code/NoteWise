import unittest
import json
from unittest.mock import patch

import main


class DocumentInsightTests(unittest.TestCase):
    def test_cached_overview_is_returned_without_regeneration(self):
        cached = {"document_id": "doc-cache", "title": "Notes", "summary": "Cached overview"}
        row = {"summary_json": json.dumps(cached)}
        with patch.object(main, "get_insight_row", return_value=row), \
             patch.object(main, "get_document_chunks", return_value=[{"page": 1, "text": "source", "index": 0}]), \
             patch.object(main, "call_json_model") as generate:
            self.assertEqual(main.document_overview("doc-cache"), cached)
        generate.assert_not_called()

    def test_summary_uses_page_groups_and_returns_real_excerpt_page(self):
        responses = [
            {"summary": "Summary for pages one and two.", "key_topics": ["Logic"], "important_concepts": ["∀"]},
            {"summary": "Summary for page three.", "key_topics": ["Proofs"], "important_concepts": ["∃"]},
            {"summary": "Combined summary.", "key_topics": ["Logic", "Proofs"], "important_concepts": ["∀", "∃"]},
        ]
        entries = [
            {"page": 1, "text": "Universal quantifier ∀x P(x).", "index": 0},
            {"page": 3, "text": "Existential quantifier ∃x P(x).", "index": 1},
        ]
        with patch.object(main, "page_groups", return_value=["[Page 1] ...", "[Page 3] ..."]), \
             patch.object(main, "call_json_model", side_effect=responses):
            summary = main.generate_document_summary("doc-1", "Quantifiers.pdf", 4, False, entries)
        self.assertEqual(summary["title"], "Quantifiers")
        self.assertEqual(summary["page_count"], 4)
        self.assertEqual(summary["processing_status"], "partial")
        self.assertEqual(summary["excerpt"]["page"], 1)
        self.assertEqual(summary["key_topics"], ["Logic", "Proofs"])

    def test_flashcards_are_validated_and_deduplicated_per_document(self):
        row = {"filename": "Quantifiers.pdf", "page_count": 1, "ocr_used": 0, "extracted_pages": 1, "cards_json": None}
        model_cards = {"cards": [
            {"question": "What does ∀ mean?", "answer": "For every element.", "evidence": "Universal ∀x"},
            {"question": "What does ∀ mean?", "answer": "Duplicate.", "evidence": "Universal ∀x"},
            {"question": "", "answer": "Invalid.", "evidence": "Universal ∀x"},
            {"question": "What does ∃ mean?", "answer": "There exists an element.", "evidence": "existential ∃x"},
            {"question": "Unsupported", "answer": 12, "evidence": "Universal ∀x"},
            {"question": "Unsupported claim", "answer": "An unrelated fact.", "evidence": "not present in document"},
        ]}
        with patch.object(main, "get_document_chunks", return_value=[{"page": 1, "text": "Universal ∀x; existential ∃x", "index": 0}]), \
             patch.object(main, "get_insight_row", return_value=row), \
             patch.object(main, "call_json_model", return_value=model_cards), \
             patch.object(main, "save_document_insight") as save:
            result = main.document_flashcards("doc-1")
        self.assertEqual(len(result["cards"]), 2)
        self.assertEqual(result["cards"][0]["question"], "What does ∀ mean?")
        save.assert_called_once()

    def test_malformed_summary_model_output_is_not_returned_as_content(self):
        with patch.object(main, "page_groups", return_value=["[Page 1] text"]), \
             patch.object(main, "call_json_model", return_value={"summary": "", "key_topics": [], "important_concepts": []}):
            with self.assertRaises(ValueError):
                main.generate_document_summary("doc-2", "Empty.pdf", 1, False,
                                               [{"page": 1, "text": "text", "index": 0}])

    def test_flashcard_api_reports_empty_document_and_model_errors(self):
        with patch.object(main, "get_document_chunks", return_value=[]):
            with self.assertRaises(main.HTTPException) as missing:
                main.document_flashcards("missing")
        self.assertEqual(missing.exception.status_code, 404)
        row = {"filename": "Notes.pdf", "page_count": 1, "ocr_used": 0,
               "extracted_pages": 1, "cards_json": None}
        with patch.object(main, "get_document_chunks", return_value=[{"page": 1, "text": "text", "index": 0}]), \
             patch.object(main, "get_insight_row", return_value=row), \
             patch.object(main, "call_json_model", side_effect=ValueError("bad JSON")):
            with self.assertRaises(main.HTTPException) as failed:
                main.document_flashcards("doc-3")
        self.assertEqual(failed.exception.status_code, 502)


if __name__ == "__main__":
    unittest.main()
