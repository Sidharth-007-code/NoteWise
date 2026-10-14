import fitz  # PyMuPDF
import sys

def extract_pdf_text(sample_pdf_path: str):
    try:
        # Open the document
        doc = fitz.open(sample_pdf_path)
        print(f"Successfully opened: {sample_pdf_path}")
        print(f"Total pages: {len(doc)}\n")

        # Extract text page by page
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            
            # Print the first 200 characters of each page
            print(f"--- Page {page_num + 1} ---")
            print(text[:200] + "...\n" if text.strip() else "[No parseable text found]\n")

        doc.close()
    except Exception as e:
        print(f"Error processing PDF: {e}")

if __name__ == "__main__":
    sample_pdf_path = "sample_pdf.pdf" 
    extract_pdf_text(sample_pdf_path)