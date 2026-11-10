import unittest
from pathlib import Path
from unittest.mock import patch

import fitz

import main


def make_pdf(text=""):
    document = fitz.open()
    page = document.new_page()
    if text:
        page.insert_text((72, 72), text)
    data = document.tobytes()
    document.close()
    return data


class OCRConfigurationTests(unittest.TestCase):
    def test_configured_tool_paths_are_detected(self):
        tesseract_name = "tesseract.exe" if main.os.name == "nt" else "tesseract"
        directory = Path("configured-tools")
        with patch.object(main, "TESSERACT_PATH", str(directory / tesseract_name)), \
             patch.object(main.Path, "is_file", lambda path: path.name == tesseract_name):
            self.assertTrue(main.tesseract_available())

    def test_missing_executables_are_reported_without_blocking_text_pdf(self):
        text = "Selectable PDF text for ordinary ingestion. " * 5
        with patch.object(main, "TESSERACT_PATH", ""), \
             patch.object(main, "POPPLER_PATH", ""), \
             patch.object(main, "pytesseract") as tesseract:
            extracted, page_count, used_ocr = main.extract_pdf_text(make_pdf(text))
        self.assertIn("Selectable PDF text", extracted)
        self.assertEqual(page_count, 1)
        self.assertFalse(used_ocr)
        tesseract.image_to_string.assert_not_called()

    def test_missing_tesseract_has_actionable_ocr_error(self):
        with patch.object(main, "TESSERACT_PATH", ""), \
             patch.object(main, "POPPLER_PATH", ""), \
             patch.object(main, "pytesseract") as tesseract:
            with self.assertRaisesRegex(ValueError, "TESSERACT_PATH"):
                main.extract_pdf_text(make_pdf())
        tesseract.image_to_string.assert_not_called()

    def test_ocr_renders_only_pages_that_need_it(self):
        pdf = fitz.open()
        first = pdf.new_page()
        first.insert_text((72, 72), "Selectable text " * 12)
        pdf.new_page()
        data = pdf.tobytes()
        pdf.close()
        with patch.object(main, "tesseract_available", return_value=True), \
             patch.object(main.pytesseract, "image_to_string", return_value="OCR recovered page content") as ocr:
            extracted, page_count, used_ocr = main.extract_pdf_text(data)
        self.assertEqual(page_count, 2)
        self.assertTrue(used_ocr)
        self.assertIn("Selectable text", extracted)
        self.assertIn("OCR recovered page content", extracted)
        ocr.assert_called_once()


if __name__ == "__main__":
    unittest.main()
