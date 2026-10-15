import sqlite3
import pymupdf as fitz
import re
import io
import os
import pkgutil
import importlib.util
from typing import List, Dict, Any, Optional
from PIL import Image

# --- Python 3.14 compatibility patch for pytesseract ---
if not hasattr(pkgutil, "find_loader"):
    def _find_loader(name):
        spec = importlib.util.find_spec(name)
        return spec.loader if spec else None
    pkgutil.find_loader = _find_loader

TESSERACT_EXE = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

try:
    import pytesseract
    if os.path.exists(TESSERACT_EXE):
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_EXE
        HAS_OCR = True
    else:
        HAS_OCR = False
        print(f"⚠️ Tesseract binary not found at '{TESSERACT_EXE}'.")
except Exception as e:
    HAS_OCR = False
    print(f"⚠️ pytesseract failed to load: {e}")

DB_NAME = "notewise.db"


def init_db():
    """Initializes SQLite database with Full-Text Search (FTS5) enabled, handling schema migrations."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(page_search)")
        columns = [row[1] for row in cursor.fetchall()]

        if columns and "subject" not in columns:
            print("🔄 Upgrading SQLite schema: Recreating 'page_search' table with 'subject' column support...")
            cursor.execute("DROP TABLE page_search")

        cursor.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS page_search USING fts5(
                doc_name,
                subject,
                page_num UNINDEXED,
                content
            )
        """)
        conn.commit()
    finally:
        conn.close()


def ocr_page(page: fitz.Page) -> str:
    """Renders page at 150 DPI (optimal scale for large-font presentation slides)."""
    if not HAS_OCR:
        return ""
    try:
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_EXE
        pix = page.get_pixmap(dpi=150)
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("L")
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        print(f"   ❌ OCR Exception on Page {page.number + 1}: {e}")
        return ""


def index_pdf(pdf_path: str, doc_name: str, subject: str = "General"):
    """Extracts text page-by-page and stores it in SQLite FTS5 with OCR fallback."""
    doc = fitz.open(pdf_path)
    page_count = len(doc)

    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM page_search WHERE doc_name = ?", (doc_name,))

        indexed_pages = 0
        empty_page_indices = []

        # Pass 1: Native text extraction
        for page_num in range(page_count):
            page_text = doc[page_num].get_text().strip()
            if page_text:
                cursor.execute(
                    "INSERT INTO page_search (doc_name, subject, page_num, content) VALUES (?, ?, ?, ?)",
                    (doc_name, subject, page_num + 1, page_text)
                )
                indexed_pages += 1
            else:
                empty_page_indices.append(page_num)

        # Pass 2: High-res OCR pipeline for scanned/image slides
        if indexed_pages == 0 and len(empty_page_indices) > 0:
            print(f"⚙️ '{doc_name}' appears scanned. Running OCR pipeline on {page_count} pages...")
            for page_num in empty_page_indices:
                ocr_text = ocr_page(doc[page_num])
                if ocr_text:
                    cursor.execute(
                        "INSERT INTO page_search (doc_name, subject, page_num, content) VALUES (?, ?, ?, ?)",
                        (doc_name, subject, page_num + 1, ocr_text)
                    )
                    indexed_pages += 1
                    lines = [line.strip() for line in ocr_text.split('\n') if len(line.strip()) > 3]
                    first_line = lines[0] if lines else 'Extracted Text'
                    print(f"   📄 Page {page_num + 1}/{page_count} OCR extracted: \"{first_line[:55]}\"")

        conn.commit()
    finally:
        conn.close()
        doc.close()

    if indexed_pages == 0:
        print(f"⚠️ WARNING: Could not index '{doc_name}'. Verify Tesseract OCR installation.")
    else:
        print(f"✅ Indexed '{doc_name}' [{subject}]: {indexed_pages}/{page_count} pages indexed into database.")


def sanitize_fts_query(query: str) -> List[str]:
    """Helper to extract clean alphanumeric word tokens for safe FTS5 query construction."""
    cleaned = re.sub(r'[^\w\s]', ' ', query)
    return [word for word in cleaned.split() if word.strip()]


def search_notes(query: str, subject_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Performs full-text search with smart stemming and flexible query fallback."""
    words = sanitize_fts_query(query)
    if not words:
        return []

    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        term_groups = []
        for w in words:
            variations = [f'"{w}"*']
            if len(w) > 3 and w.lower().endswith('s'):
                variations.append(f'"{w[:-1]}"*')
            if len(w) > 4 and w.lower().endswith('es'):
                variations.append(f'"{w[:-2]}"*')
            term_groups.append("(" + " OR ".join(set(variations)) + ")")

        fts_query_and = " AND ".join(term_groups)
        fts_query_or = " OR ".join(term_groups)

        def execute_fts(fts_q):
            try:
                if subject_filter and subject_filter != "All":
                    cursor.execute("""
                        SELECT doc_name, subject, page_num, snippet(page_search, 3, '<b>', '</b>', '...', 25), content
                        FROM page_search
                        WHERE page_search MATCH ? AND subject = ?
                        ORDER BY rank
                        LIMIT 15
                    """, (fts_q, subject_filter))
                else:
                    cursor.execute("""
                        SELECT doc_name, subject, page_num, snippet(page_search, 3, '<b>', '</b>', '...', 25), content
                        FROM page_search
                        WHERE page_search MATCH ?
                        ORDER BY rank
                        LIMIT 15
                    """, (fts_q,))
                return cursor.fetchall()
            except sqlite3.OperationalError as e:
                print(f"⚠️ FTS Search Query Exception: {e}")
                return []

        rows = execute_fts(fts_query_and)
        if not rows:
            rows = execute_fts(fts_query_or)

        results = []
        for row in rows:
            results.append({
                "doc_name": row[0],
                "subject": row[1],
                "page_num": row[2],
                "snippet": row[3],
                "full_content": row[4]
            })

        return results
    finally:
        conn.close()


def search_context(query: str, subject: Optional[str] = None, limit: int = 5) -> List[Dict[str, Any]]:
    """Search for relevant PDF context snippets for grounded Q&A."""
    words = sanitize_fts_query(query)
    if not words:
        return []

    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        and_terms = [f'"{word}"*' for word in words]
        fts_query_and = " AND ".join(and_terms)
        fts_query_or = " OR ".join(and_terms)

        def execute_context_search(fts_q):
            try:
                if subject and subject != "All":
                    cursor.execute("""
                        SELECT doc_name, subject, page_num, content
                        FROM page_search
                        WHERE page_search MATCH ? AND subject = ?
                        ORDER BY rank
                        LIMIT ?
                    """, (fts_q, subject, limit))
                else:
                    cursor.execute("""
                        SELECT doc_name, subject, page_num, content
                        FROM page_search
                        WHERE page_search MATCH ?
                        ORDER BY rank
                        LIMIT ?
                    """, (fts_q, limit))
                return cursor.fetchall()
            except sqlite3.OperationalError as e:
                print(f"⚠️ FTS Context Query Exception: {e}")
                return []

        rows = execute_context_search(fts_query_and)
        if not rows and len(words) > 1:
            rows = execute_context_search(fts_query_or)

        results = []
        for row in rows:
            results.append({
                "doc_name": row[0],
                "subject": row[1],
                "page_number": row[2],
                "content": row[3]
            })

        return results
    finally:
        conn.close()


def get_all_documents() -> List[Dict[str, Any]]:
    """Fetches list of all indexed documents with total page counts and subjects."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT doc_name, subject, COUNT(page_num) as page_count
            FROM page_search
            GROUP BY doc_name, subject
            ORDER BY subject ASC, doc_name ASC
        """)
        return [{"doc_name": row[0], "subject": row[1], "page_count": row[2]} for row in cursor.fetchall()]
    finally:
        conn.close()


def get_all_subjects() -> List[str]:
    """Retrieves unique list of subjects currently in database."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT subject FROM page_search WHERE subject IS NOT NULL AND subject != ''")
        subjects = [row[0] for row in cursor.fetchall()]
        return list(set(subjects))
    finally:
        conn.close()


def delete_document(doc_name: str):
    """Deletes all indexed entries for a specific document."""
    conn = sqlite3.connect(DB_NAME)
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM page_search WHERE doc_name = ?", (doc_name,))
        conn.commit()
    finally:
        conn.close()