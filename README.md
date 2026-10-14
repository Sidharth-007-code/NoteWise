# NoteWise 🎓

> **Source-First Local PDF Study Assistant**  
> Parse slide decks, search course notes instantly via local FTS5, and generate AI-powered summaries and active-recall flashcards with near-zero latency.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)

---

## 🌟 Key Architecture & Capabilities

* **Hybrid OCR & Extraction Pipeline:** Primary native text extraction powered by PyMuPDF (`fitz`), seamlessly falling back to a **150 DPI Tesseract OCR engine** optimized for presentation slide fonts and scanned PDFs.
* **SQLite FTS5 Search Engine:** Embedded full-text search database supporting course/subject tagging, page-level tracking, stemming, and inline snippet highlighting (`<b>query</b>`).
* **High-Speed AI Study Tools:** Instant generation of structured page summaries and active-recall practice cards ($Q1/A1$ format) powered by Groq API (`openai/gpt-oss-120b`).
* **Dynamic Model Auto-Discovery:** Automated fallback mechanism (`groq_client.models.list()`) that queries live text models dynamically if primary model endpoints shift or decommission.

---

## 🛠️ Tech Stack

| Domain | Technology |
| :--- | :--- |
| **Backend Framework** | Python 3.10+, FastAPI, Uvicorn (WatchFiles) |
| **Document Processing** | PyMuPDF (`fitz`), pytesseract (Tesseract 5 OCR) |
| **Database & Search** | SQLite3 with FTS5 Virtual Tables |
| **AI Engine** | Groq SDK (`groq`) |
| **Frontend** | React, TypeScript, Vite |

---

## 🚀 Quickstart & Installation

### Prerequisites
1. **Python 3.10+** & **Node.js**
2. **Tesseract OCR 5** installed at `C:\Program Files\Tesseract-OCR\tesseract.exe` (or in system `PATH`).

### 1. Environment Setup
Create a `.env` file in the root directory (or use `.env.example` as a reference):
```env
GROQ_API_KEY=your_groq_api_key_here

```

### 2. Backend Execution

```bash
cd backend
pip install -r requirements.txt
python main.py

```

*Backend runs on `http://127.0.0.1:8000*`

### 3. Frontend Execution

```bash
cd frontend
npm install
npm run dev

```

*Frontend runs on `http://localhost:5173*`

---

## 📡 API Reference

| Endpoint | Method | Description |
| --- | --- | --- |
| `/health` | `GET` | Server health check |
| `/upload` | `POST` | Upload PDF and tag with subject |
| `/documents` | `GET` | List all indexed documents & subjects |
| `/documents/{doc_name}` | `DELETE` | Delete document entry from DB and disk |
| `/search` | `GET` | Query FTS5 index (`?q=term&subject=name`) |
| `/ai/study-tools` | `POST` | Generate summary/quiz for page |
| `/pdf/{filename}` | `GET` | Stream PDF file inline |

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.

```