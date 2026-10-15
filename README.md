# NoteWise 🎓

> **Source-First Local PDF Study Assistant**  
> Parse slide decks, search course notes instantly via local FTS5, preview documents inline, and engage in syllabus-grounded AI Q&A with explicit source citations.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)

---

## 🌟 Key Architecture & Capabilities

* **Unified 3-Panel Workspace:** Multi-panel React dashboard integrating PDF management/upload, inline document previewing with FTS search navigation, and a synchronized AI Q&A chat assistant.
* **Syllabus-Grounded AI Q&A:** "Ask NoteWise" feature queries SQLite FTS5 for top matching context snippets and generates grounded answers via Groq LLM with strict source citations (``).
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
| **Frontend** | React 18, CSS3, Modern Workspace Components |

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