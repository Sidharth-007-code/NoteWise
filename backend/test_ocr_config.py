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
        poppler_name = "pdftoppm.exe" if main.os.name == "nt" else "pdftoppm"
        directory = Path("configured-tools")
        with patch.object(main, "TESSERACT_PATH", str(directory / tesseract_name)), \
             patch.object(main, "POPPLER_PATH", str(directory)), \
             patch.object(main.Path, "is_file", lambda path: path.name in {tesseract_name, poppler_name}):
            self.assertTrue(main.tesseract_available())
            self.assertEqual(main.poppler_executable(), directory / poppler_name)

    def test_missing_executables_are_reported_without_blocking_text_pdf(self):
        text = "Selectable PDF text for ordinary ingestion. " * 5
        with patch.object(main, "TESSERACT_PATH", ""), \
             patch.object(main, "POPPLER_PATH", ""), \
             patch.object(main, "convert_from_bytes") as convert:
            extracted, page_count, used_ocr = main.extract_pdf_text(make_pdf(text))
        self.assertIn("Selectable PDF text", extracted)
        self.assertEqual(page_count, 1)
        self.assertFalse(used_ocr)
        convert.assert_not_called()

    def test_missing_tesseract_has_actionable_ocr_error(self):
        with patch.object(main, "TESSERACT_PATH", ""), \
             patch.object(main, "POPPLER_PATH", ""), \
             patch.object(main, "convert_from_bytes") as convert:
            with self.assertRaisesRegex(ValueError, "TESSERACT_PATH"):
                main.extract_pdf_text(make_pdf())
        convert.assert_not_called()

    def test_missing_poppler_has_actionable_ocr_error(self):
        with patch.object(main, "TESSERACT_PATH", "configured-tesseract"), \
             patch.object(main, "POPPLER_PATH", ""), \
             patch.object(main, "tesseract_available", return_value=True), \
             patch.object(main, "convert_from_bytes") as convert:
            with self.assertRaisesRegex(ValueError, "POPPLER_PATH"):
                main.extract_pdf_text(make_pdf())
        convert.assert_not_called()


if __name__ == "__main__":
    unittest.main()
