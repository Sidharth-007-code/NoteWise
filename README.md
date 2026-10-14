# NoteWise

A source-first PDF search, retrieval, and active study application that leverages OCR, full-text search, and AI-powered study tools to transform PDF documents into interactive knowledge bases.

## Architecture

NoteWise employs a three-layer architecture optimized for academic and professional document processing:

### 1. OCR Processing Pipeline
- **Tesseract OCR at 150 DPI**: Optimized for large-font presentation slides (28-48pt text)
- **Two-pass extraction**: 
  - First pass: Native text extraction via PyMuPDF
  - Second pass: OCR fallback for scanned/image-based content at 300 DPI
- **Image preprocessing**: Grayscale conversion for improved OCR accuracy

### 2. Storage & Indexing
- **SQLite Database**: Single-file, zero-configuration storage (`notewise.db`)
- **Full-Text Search (FTS5)**: Virtual table enabling fast, relevant keyword search with snippet highlighting
- **Search Features**:
  - Smart stemming and wildcard expansion
  - Subject-based filtering
  - Ranked results with contextual snippets

### 3. AI Integration Layer
- **Groq API**: Low-latency inference for Llama and OSS models
- **Dynamic Model Discovery**: Fallback mechanism to query available models from Groq account
- **Study Tools**:
  - Structured summarization (bullet-point revision notes)
  - Active-recall quiz generation (Q&A format)
- **Prompt Engineering**: Specialized system prompts for academic study assistance

## Tech Stack

### Backend
- **Framework**: FastAPI (ASGI, modern, high-performance)
- **API Layer**: RESTful endpoints with automatic OpenAPI documentation
- **Database**: SQLite with FTS5 extension
- **OCR Engine**: 
  - PyMuPDF (fitz) for PDF rendering and text extraction
  - Tesseract OCR via pytesseract (150 DPI primary, 300 DPI fallback)
- **AI Services**: 
  - Groq API client
  - Model fallback: GPT-OSS (120B/20B), Llama 3.1 8B Instant
- **Environment**: Python 3.12+ with python-dotenv for configuration
- **Development**: Watchfiles for auto-reload during development

### Frontend
- **Framework**: React (Vite) - inferred from port 5173 in CORS configuration
- **Styling**: Tailwind CSS (common with Vite+React templates)
- **State Management**: React Context or similar (implementation-specific)

### DevOps
- **Containerization**: Docker-ready (single binary potential)
- **Configuration**: Environment variables via `.env`
- **Dependencies**: Explicitly versioned in `requirements.txt`

## Setup Instructions

### Prerequisites
- Python 3.12 or higher
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) installed and added to PATH
  - Windows: Install from [UB Mannheim builds](https://github.com/UB-Mannheim/tesseract/wiki)
  - Verify installation: `tesseract --version`
- Groq API key (obtain from [console.groq.com](https://console.groq.com/))
- Git (optional, for version control)

### Backend Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd NoteWise
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   venv\Scripts\activate     # Windows
   ```

3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```

4. Configure environment variables:
   - Copy the example environment file:
     ```bash
     cp backend/.env.example backend/.env
     ```
   - Edit `backend/.env` to add your Groq API key:
     ```env
     GROQ_API_KEY=your_groq_api_key_here
     ```

5. Launch the development server:
   ```bash
   cd backend
   python main.py
   ```
   - The API will be available at `http://127.0.0.1:8000`
   - Interactive API docs: `http://127.0.0.1:8000/docs`

### Frontend Setup
*Note: Frontend code is located in the `frontend/` directory. Setup instructions assume a standard Vite+React project.*
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   - The application will be available at `http://localhost:5173`
   - Configured to proxy API requests to `http://127.0.0.1:8000` (adjust if needed)

## API Endpoints

All API endpoints are prefixed with `/` and return JSON responses unless otherwise noted.

### Health Check
- **GET** `/health`
- **Description**: Verify API availability
- **Response**:
  ```json
  {
    "status": "ok",
    "message": "NoteWise API is running."
  }
  ```

### Document Management
- **GET** `/documents`
  - **Description**: List all indexed documents and available subjects
  - **Response**:
    ```json
    {
      "documents": [
        {
          "doc_name": "string",
          "subject": "string", 
          "page_count": integer
        }
      ],
      "subjects": ["string"]
    }
    ```

- **DELETE** `/documents/{doc_name}`
  - **Description**: Delete a document and its associated file
  - **Path Parameter**: `doc_name` (string)
  - **Response**:
    ```json
    {
      "status": "success",
      "message": "Deleted {doc_name}"
    }
    ```

### Document Upload
- **POST** `/upload`
  - **Description**: Upload and index a PDF file
  - **Form Parameters**:
    - `file`: PDF file (required)
    - `subject`: Classification tag (optional, defaults to "General")
  - **Response**:
    ```json
    {
      "status": "success",
      "filename": "string",
      "subject": "string",
      "message": "Successfully indexed '{filename}' under [subject]"
    }
    ```
  - **Errors**:
    - `400`: Non-PDF file uploaded

### Search
- **GET** `/search`
  - **Description**: Search indexed content with optional subject filtering
  - **Query Parameters**:
    - `q`: Search string (required, min length 1)
    - `subject`: Filter by subject (optional, defaults to "All")
  - **Response**:
    ```json
    {
      "query": "string",
      "subject_filter": "string",
      "total_results": integer,
      "results": [
        {
          "doc_name": "string",
          "subject": "string",
          "page_num": integer,
          "snippet": "string (HTML with <b> tags)",
          "full_content": "string"
        }
      ]
    }
    ```

### AI Study Tools
- **POST** `/ai/study-tools`
  - **Description**: Generate summaries or quiz questions from page content
  - **Request Body**:
    ```json
    {
      "tool_type": "summary" | "quiz",
      "page_text": "string",
      "doc_name": "string",
      "page_num": integer
    }
    ```
  - **Response**:
    ```json
    {
      "type": "summary" | "quiz",
      "doc_name": "string",
      "page_num": integer,
      "content": "string (generated study material)"
    }
    ```
  - **Note**: Falls back to extractive summary if GROQ_API_KEY is not configured

### PDF Retrieval
- **GET** `/pdf/{filename}`
  - **Description**: Serve uploaded PDF files for viewing
  - **Path Parameter**: `filename` (string)
  - **Response**: PDF file with inline disposition headers

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GROQ_API_KEY` | API key for Groq inference service | Yes | (none) |

Create a `.env` file in the `backend/` directory with:
```env
GROQ_API_KEY=your_actual_key_here
```

## Notes

- **OCR Dependency**: Tesseract OCR must be installed separately. The application attempts to auto-detect the Tesseract executable at `C:\Program Files\Tesseract-OCR\tesseract.exe` on Windows.
- **Database**: SQLite database (`notewise.db`) is created automatically in the backend directory on first run.
- **Uploads**: PDF files are stored in the `backend/uploads/` directory.
- **Development**: Backend uses auto-reload via Watchfiles when run with `python main.py`.
- **Production**: For deployment, consider using a production ASGI server (e.g., Uvicorn with Gunicorn) and disable reload.

## License

This project is proprietary software. All rights reserved.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) for the web framework
- [Groq](https://groq.com/) for low-latency AI inference
- [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) for optical character recognition
- [PyMuPDF](https://pymupdf.readthedocs.io/) for PDF processing
- [SQLite](https://www.sqlite.org/fts5.html) for full-text search capabilities