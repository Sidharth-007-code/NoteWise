import gc
import sqlite3
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException

import main


class ReaderStorageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=main.BASE_DIR)
        self.root = Path(self.temp.name)
        self.database = self.root / "insights.sqlite3"
        self.uploads = self.root / "uploads"
        self.client = main.chromadb.EphemeralClient()
        self.collection = self.client.create_collection(f"reader-{uuid.uuid4().hex}")
        self.patches = [
            patch.object(main, "INSIGHTS_DB", self.database),
            patch.object(main, "UPLOADS_DIR", self.uploads),
            patch.object(main, "collection", self.collection),
        ]
        for item in self.patches:
            item.start()
        main.init_insights_db()

    def tearDown(self):
        for item in reversed(self.patches):
            item.stop()
        gc.collect()
        self.temp.cleanup()

    def add_document(self, document_id="doc-1", chunks=None):
        main.save_document_insight(document_id, "Reader.pdf", 3, False, 3)
        if chunks:
            self.collection.add(
                ids=[f"{document_id}_{index}" for index in range(len(chunks))],
                documents=[item["text"] for item in chunks],
                metadatas=[{
                    "document_id": document_id, "source": "Reader.pdf",
                    "page": item["page"], "chunk_index": index,
                    **({"chunk_start": item["start"]} if item.get("start") is not None else {}),
                } for index, item in enumerate(chunks)],
            )

    def test_pdf_storage_uses_document_id_and_atomic_final_name(self):
        content = b"%PDF-1.7 test bytes"
        path = main.store_pdf_atomically("doc_1-abc", content)
        self.assertEqual(path, self.uploads / "doc_1-abc.pdf")
        self.assertEqual(path.read_bytes(), content)
        self.assertEqual(list(self.uploads.glob("*.tmp")), [])

    def test_document_ids_are_validated_before_path_creation(self):
        for invalid in ("../secret", "a/b", "", "id.pdf"):
            with self.subTest(invalid=invalid), self.assertRaises(HTTPException) as raised:
                main.document_pdf_path(invalid)
            self.assertEqual(raised.exception.status_code, 400)
        self.assertFalse(self.uploads.exists())

    def test_failed_ingestion_cleanup_removes_vectors_metadata_and_pdf(self):
        self.add_document("failed", [{"text": "partial", "page": 1, "start": 0}])
        path = main.store_pdf_atomically("failed", b"partial")
        main.cleanup_failed_ingest("failed")
        self.assertIsNone(main.get_insight_row("failed"))
        self.assertEqual(self.collection.get(where={"document_id": "failed"}, include=[])["ids"], [])
        self.assertFalse(path.exists())

    def test_file_route_returns_local_pdf_and_missing_legacy_pdf_is_404(self):
        self.add_document("retained")
        path = main.store_pdf_atomically("retained", b"%PDF")
        response = main.document_file("retained")
        self.assertEqual(Path(response.path), path)
        self.assertEqual(response.media_type, "application/pdf")
        self.add_document("legacy")
        with self.assertRaises(HTTPException) as missing:
            main.document_file("legacy")
        self.assertEqual(missing.exception.status_code, 404)

    def test_pages_route_groups_orders_and_removes_known_overlap(self):
        first = "A" * 850 + " OVERLAP " + "B" * 50
        second_start = len(first) - 150
        second = first[second_start:] + " unique ending"
        self.add_document("pages", [
            {"text": "page two", "page": 2, "start": 0},
            {"text": first, "page": 1, "start": 0},
            {"text": second, "page": 1, "start": second_start},
        ])
        result = main.document_pages("pages")
        self.assertEqual(result["document_id"], "pages")
        self.assertEqual(result["filename"], "Reader.pdf")
        self.assertEqual([item["page"] for item in result["pages"]], [1, 2])
        expected = first + " unique ending"
        self.assertEqual(result["pages"][0]["text"], expected)
        self.assertEqual(result["pages"][0]["text"].count("OVERLAP"), 1)

    def test_legacy_chunks_remove_exact_bounded_overlap_and_keep_nonoverlap(self):
        prefix = "opening content " * 20
        first = prefix + "shared boundary text"
        second = "shared boundary text" + " closing content " * 12
        joined = main._merge_page_chunks([
            {"index": 0, "text": first, "start": None},
            {"index": 1, "text": second, "start": None},
        ])
        self.assertEqual(joined, first + second[len("shared boundary text"):])
        self.assertEqual(joined.count("shared boundary text"), 1)

    def test_page_route_rejects_unknown_or_unprocessed_document(self):
        with self.assertRaises(HTTPException) as missing:
            main.document_pages("absent")
        self.assertEqual(missing.exception.status_code, 404)
        self.add_document("no-chunks")
        with self.assertRaises(HTTPException) as no_text:
            main.document_pages("no-chunks")
        self.assertEqual(no_text.exception.status_code, 404)

    def test_delete_removes_pdf_and_preserves_response_contract(self):
        self.add_document("to-delete", [{"text": "page", "page": 1, "start": 0}])
        path = main.store_pdf_atomically("to-delete", b"%PDF")
        response = main.delete_document("to-delete")
        self.assertEqual(response, {"success": True, "document_id": "to-delete", "deleted_chunks": 1})
        self.assertFalse(path.exists())
        self.assertIsNone(main.get_insight_row("to-delete"))

    def test_partial_ingest_failure_removes_new_chroma_chunks(self):
        payload = b"%PDF test"
        class FakeUpload:
            filename = "Failure.pdf"
            read = AsyncMock(return_value=payload)
            close = AsyncMock()

        upload = FakeUpload()
        class PartialCollection:
            def __init__(self):
                self.added = []
                self.deleted = False

            def add(self, ids, documents, metadatas):
                self.added.extend(ids)
                raise RuntimeError("simulated partial vector insertion failure")

            def delete(self, where):
                self.deleted = True
                self.added = []

            def count(self):
                return len(self.added)

        partial_collection = PartialCollection()
        async def inline_threadpool(function, *args):
            return function(*args)
        with patch.object(main, "extract_pdf_text", return_value=("[Page 1] text", 1, False)), \
             patch.object(main, "store_pdf_atomically", side_effect=OSError("disk full")), \
             patch.object(main, "run_in_threadpool", side_effect=inline_threadpool), \
             patch.object(main, "collection", partial_collection):
            with self.assertRaises(HTTPException) as raised:
                coroutine = main.ingest_pdf(upload)
                coroutine.send(None)
        self.assertEqual(raised.exception.status_code, 500)
        self.assertTrue(partial_collection.deleted)
        self.assertEqual(partial_collection.count(), 0)
        self.assertEqual(main.list_documents(), {"documents": []})


if __name__ == "__main__":
    unittest.main()
