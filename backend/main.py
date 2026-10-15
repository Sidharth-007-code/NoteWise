import os
import shutil
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from database import (
    init_db, index_pdf, search_notes, get_all_documents,
    get_all_subjects, delete_document, search_context
)

# --- Auto-load environment variables from .env file ---
from dotenv import load_dotenv
load_dotenv()

# --- Initialize Groq API Client ---
from groq import Groq

groq_client = None
if os.getenv("GROQ_API_KEY"):
    try:
        groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        print("⚡ Groq AI Engine initialized successfully.")
    except Exception as e:
        print(f"⚠️ Failed to initialize Groq client: {e}")
else:
    print("⚠️ GROQ_API_KEY not found in environment or .env file.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

app = FastAPI(
    title="NoteWise API",
    description="Source-first PDF search, retrieval, and active study API",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def sanitize_filename(filename: str) -> str:
    """Removes special characters that break URLs and file paths."""
    clean_name = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    return clean_name

class StudyAssistRequest(BaseModel):
    tool_type: str  # "summary" or "quiz"
    page_text: str
    doc_name: str
    page_num: int

class ChatRequest(BaseModel):
    question: str
    subject: Optional[str] = None

def generate_ai_content_groq(prompt: str) -> str:
    """Generates AI content using active Groq models with dynamic model discovery fallback."""
    # Active Groq models
    models_to_try = [
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "llama-3.1-8b-instant"
    ]

    for model_name in models_to_try:
        try:
            response = groq_client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": "You are NoteWise, a precise academic study assistant and exam tutor."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            if response.choices and response.choices[0].message.content:
                return response.choices[0].message.content
        except Exception as e:
            print(f"⚠️ Groq model '{model_name}' notice: {e}. Trying next...")

    # Dynamic Discovery Fallback: Fetch currently active text models directly from Groq API
    try:
        print("🔍 Querying Groq API for currently active models on your account...")
        available_models = groq_client.models.list()
        text_models = [
            m.id for m in available_models.data
            if not any(k in m.id for k in ["whisper", "guard", "vision", "embed", "safeguard"])
        ]

        for active_model in text_models:
            try:
                print(f"⚡ Testing dynamic model: {active_model}")
                response = groq_client.chat.completions.create(
                    model=active_model,
                    messages=[
                        {"role": "system", "content": "You are NoteWise, a precise academic study assistant and exam tutor."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=1000
                )
                if response.choices and response.choices[0].message.content:
                    return response.choices[0].message.content
            except Exception:
                continue
    except Exception as list_err:
        print(f"❌ Dynamic model discovery error: {list_err}")

    raise Exception("No active Groq text models available. Check console.groq.com for active models.")

@app.get("/health")
async def health_check():
    return {"status": "ok", "message": "NoteWise API is running."}

@app.get("/documents")
async def list_documents():
    """Returns list of currently indexed documents and available subjects."""
    return {
        "documents": get_all_documents(),
        "subjects": get_all_subjects()
    }

@app.delete("/documents/{doc_name}")
async def remove_document(doc_name: str):
    """Deletes a document from the FTS5 database and removes its file from disk."""
    delete_document(doc_name)
    file_path = os.path.join(UPLOAD_DIR, doc_name)
    if os.path.exists(file_path):
        os.remove(file_path)
    return {"status": "success", "message": f"Deleted {doc_name}"}

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    subject: str = Form("General")
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    clean_name = sanitize_filename(file.filename)
    clean_subject = subject.strip() if subject.strip() else "General"
    file_path = os.path.join(UPLOAD_DIR, clean_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    index_pdf(file_path, clean_name, subject=clean_subject)

    return {
        "status": "success",
        "filename": clean_name,
        "subject": clean_subject,
        "message": f"Successfully indexed '{clean_name}' under [{clean_subject}]"
    }

@app.get("/search")
async def search(
    q: str = Query(..., min_length=1, description="Search query string"),
    subject: str = Query("All", description="Filter search by subject tag")
):
    results = search_notes(q, subject_filter=subject)
    return {
        "query": q,
        "subject_filter": subject,
        "total_results": len(results),
        "results": results
    }

@app.post("/ai/study-tools")
@app.post("/ai/study-tools/")
async def study_tools(req: StudyAssistRequest):
    """Generates AI revision summaries or active-recall quiz questions via Groq."""
    text = req.page_text.strip()
    if not text:
        return {"result": "No text content available on this page to analyze."}

    if not groq_client:
        clean_lines = [line.strip() for line in text.split("\n") if len(line.strip()) > 15 and not line.strip().startswith("Page")]
        fallback_bullets = "\n".join([f"• {line}" for line in clean_lines[:5]])
        return {
            "type": req.tool_type,
            "doc_name": req.doc_name,
            "page_num": req.page_num,
            "content": f"⚠️ (Set GROQ_API_KEY in .env for full AI generation)\n\nPage Excerpt:\n{fallback_bullets}"
        }

    try:
        if req.tool_type == "summary":
            prompt = f"""
Analyze the following source text from Page {req.page_num} of '{req.doc_name}'.
Synthesize a structured, bulleted revision summary focusing ONLY on key concepts, definitions, and technical rules.
Ignore running headers, footers, page numbers, and slide metadata.

Source Text:
{text}
            """
            generated_text = generate_ai_content_groq(prompt)
            return {
                "type": "summary",
                "doc_name": req.doc_name,
                "page_num": req.page_num,
                "content": generated_text
            }

        elif req.tool_type == "quiz":
            prompt = f"""
Based strictly on Page {req.page_num} of '{req.doc_name}', generate 3 high-yield conceptual questions with clear, concise model answers.
Format each item clearly as:
Q1: [Question]
A1: [Answer]

Source Text:
{text}
            """
            generated_text = generate_ai_content_groq(prompt)
            return {
                "type": "quiz",
                "doc_name": req.doc_name,
                "page_num": req.page_num,
                "content": generated_text
            }

    except Exception as e:
        print(f"⚠️ Groq Notice: {e}")
        return {
            "type": req.tool_type,
            "doc_name": req.doc_name,
            "page_num": req.page_num,
            "content": f"⚡ AI generation error: {str(e)}"
        }

@app.post("/ai/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Grounded Q&A endpoint that answers questions based on PDF context.
    Uses retrieval-augmented generation with citations to source documents.
    """
    if not groq_client:
        return {
            "answer": "⚠️ GROQ_API_KEY not configured. Please set your Groq API key in the .env file.",
            "sources": [],
            "context_found": False
        }

    # Search for relevant context
    context_results = search_context(request.question, subject=request.subject, limit=5)

    if not context_results:
        return {
            "answer": "I couldn't find any relevant information in your notes to answer that question. Try rephrasing or check if you've uploaded PDFs on this topic.",
            "sources": [],
            "context_found": False
        }

    # Build context string for the prompt
    context_parts = []
    sources = []
    for i, ctx in enumerate(context_results, 1):
        context_part = f"[Source {i}: {ctx['doc_name']}, Page {ctx['page_number']}]\n{ctx['content']}\n"
        context_parts.append(context_part)
        sources.append({
            "doc_name": ctx['doc_name'],
            "page_number": ctx['page_number'],
            "snippet": ctx['content'][:200] + "..." if len(ctx['content']) > 200 else ctx['content']
        })

    context_str = "\n---\n".join(context_parts)

    # Construct grounded prompt
    prompt = f"""
You are NoteWise, a precise academic study assistant. Answer the user's question based ONLY on the provided PDF context snippets below.
When stating facts, cite the source using the format [Source X: document_name, page_number].
If the context doesn't contain enough information to answer fully, say so and provide what you can from the context.
Do not make up information or use external knowledge.

Context:
{context_str}

Question: {request.question}

Answer:"""

    try:
        # Use the existing generate_ai_content_groq function for the LLM call
        answer = generate_ai_content_groq(prompt)

        return {
            "answer": answer,
            "sources": sources,
            "context_found": True
        }
    except Exception as e:
        print(f"⚠️ Groq Notice in chat endpoint: {e}")
        return {
            "answer": f"⚡ Error generating answer: {str(e)}",
            "sources": sources,
            "context_found": True
        }

@app.get("/pdf/{filename}")
async def get_pdf(filename: str):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="PDF file not found.")

    return FileResponse(
        file_path,
        media_type="application/pdf",
        headers={"Content-Disposition": "inline"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)