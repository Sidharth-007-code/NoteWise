import os
import shutil
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pypdf
from openai import OpenAI

app = FastAPI(title="NoteWise RAG Backend (Groq Powered with KaTeX)")

# Enable CORS for React frontend cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Groq API Key Setup
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "***REDACTED***")

client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1",
)

# Multi-Model Fallback Queue
MODELS_TO_TRY = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "llama-3.1-8b-instant"
]

uploaded_documents = []
UPLOAD_DIR = "./uploaded_pdfs"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# --- Schemas ---

class QueryRequest(BaseModel):
    question: str
    subject: Optional[str] = "General"

class SourceCitation(BaseModel):
    doc_name: str
    page_number: int

class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]

class StudyToolRequest(BaseModel):
    tool_type: str
    prompt: Optional[str] = ""
    doc_name: Optional[str] = "General Context"
    count: Optional[int] = 1


# --- Dynamic PDF Extractor ---

def extract_text_from_pdf(file_path: str) -> tuple[str, int]:
    text = ""
    page_count = 1
    try:
        reader = pypdf.PdfReader(file_path)
        page_count = len(reader.pages)
        for i, page in enumerate(reader.pages):
            extracted = page.extract_text()
            if extracted:
                text += f"\n--- Page {i+1} ---\n" + extracted
    except Exception as e:
        print(f"Error reading PDF: {e}")
    return text, page_count


def process_and_index_pdf(file_path: str, filename: str, subject: str):
    text, page_count = extract_text_from_pdf(file_path)

    doc_entry = {
        "doc_name": filename,
        "subject": subject,
        "page_count": page_count,
        "file_path": file_path,
        "content": text
    }
    
    global uploaded_documents
    uploaded_documents = [d for d in uploaded_documents if d["doc_name"] != filename]
    uploaded_documents.append(doc_entry)
    return doc_entry


def generate_groq_answer_with_fallback(question: str, subject: str):
    if not uploaded_documents:
        return (
            "No PDF document is currently indexed. Please upload a PDF using the '+' button in the input bar.",
            []
        )

    active_doc = uploaded_documents[-1]
    doc_name = active_doc["doc_name"]
    doc_text = active_doc.get("content", "")[:12000]

    system_prompt = (
        f"You are NoteWise AI, an intelligent academic tutor.\n"
        f"You are provided with text extracted from the student's study document: '{doc_name}'.\n"
        f"Answer the user's question accurately, clearly, and concisely using the document context when relevant.\n\n"
        f"CRITICAL LATEX FORMATTING RULES:\n"
        f"1. EVERY mathematical formula, fraction, probability symbol, or set operation MUST be wrapped in standard LaTeX delimiters:\n"
        f"   - Use '$' for inline math (e.g., $P(A) = \\frac{{13}}{{52}}$, $P(A \\cap B) = P(A)P(B)$).\n"
        f"   - Use '$$' for standalone block equations (e.g., $$P(A \\cup B) = \\frac{{13}}{{52}} + \\frac{{4}}{{52}} - \\frac{{1}}{{52}} = \\frac{{16}}{{52}}$$).\n"
        f"2. NEVER output raw unformatted bracket blocks like '[ P(A) ]' or plain unescaped fraction strings."
    )

    user_prompt = f"Document Context:\n{doc_text}\n\nStudent Question: {question}"

    answer = None
    last_error = None

    for model_id in MODELS_TO_TRY:
        try:
            completion = client.chat.completions.create(
                model=model_id,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
            )
            answer = completion.choices[0].message.content
            break
        except Exception as e:
            print(f"Model {model_id} failed: {e}. Trying fallback model...")
            last_error = e

    if not answer:
        answer = f"Error generating answer after trying all fallback models. Last Error: {str(last_error)}"

    sources = [{"doc_name": doc_name, "page_number": 1}]
    return answer, sources


# --- API Endpoints ---

@app.get("/")
def root():
    return {"status": "ok", "message": "NoteWise Groq Engine Active"}


@app.get("/documents")
def get_documents():
    return {"documents": uploaded_documents}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...), subject: str = Form("General")):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files supported.")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc = process_and_index_pdf(file_path, file.filename, subject)
    return {"message": "Indexed successfully", "document": doc}


@app.post("/ask", response_model=QueryResponse)
async def ask_question(req: QueryRequest):
    try:
        answer, sources = generate_groq_answer_with_fallback(req.question, req.subject)
        return QueryResponse(answer=answer, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/chat", response_model=QueryResponse)
async def ask_question_alias(req: QueryRequest):
    try:
        answer, sources = generate_groq_answer_with_fallback(req.question, req.subject)
        return QueryResponse(answer=answer, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/documents/{doc_name}")
def delete_document(doc_name: str):
    global uploaded_documents
    uploaded_documents = [d for d in uploaded_documents if d["doc_name"] != doc_name]
    file_path = os.path.join(UPLOAD_DIR, doc_name)
    if os.path.exists(file_path):
        os.remove(file_path)
    return {"message": f"Deleted {doc_name}"}


@app.post("/study-tools")
async def study_tools(req: StudyToolRequest):
    doc = req.doc_name or "your indexed notes"
    quiz_content = None

    for model_id in MODELS_TO_TRY:
        try:
            completion = client.chat.completions.create(
                model=model_id,
                messages=[
                    {"role": "system", "content": "You are an AI study coach generating active recall quizzes."},
                    {"role": "user", "content": f"Generate 3 challenging active recall quiz questions testing core concepts from {doc}."}
                ],
                temperature=0.5,
            )
            quiz_content = f"⚡ Active Recall Practice for {doc}:\n\n" + completion.choices[0].message.content
            break
        except Exception as e:
            print(f"Quiz model {model_id} failed: {e}. Trying fallback...")

    if not quiz_content:
        quiz_content = (
            f"⚡ Active Recall Practice for {doc}:\n\n"
            f"1. Summarize the main topics covered in {doc}.\n"
            f"2. Define key terms or algorithms introduced in the text.\n"
            f"3. Type your answer from memory in the input bar below!"
        )

    return {"tool_type": req.tool_type, "content": quiz_content}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)