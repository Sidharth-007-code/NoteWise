import unittest
from unittest.mock import patch

from fastapi import HTTPException

import main


class UploadLimitTests(unittest.TestCase):
    def test_oversized_pdf_is_rejected_with_payload_too_large(self):
        class FakeUpload:
            filename = "large.pdf"

            async def read(self):
                return b"12345"

            async def close(self):
                pass

        upload = FakeUpload()
        with patch.object(main, "MAX_UPLOAD_SIZE", 4):
            with self.assertRaises(HTTPException) as error:
                main.ingest_pdf(upload).send(None)

        self.assertEqual(error.exception.status_code, 413)
        self.assertEqual(error.exception.detail, "PDF exceeds the 20 MB upload limit.")


if __name__ == "__main__":
    unittest.main()
