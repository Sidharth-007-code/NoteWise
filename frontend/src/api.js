const API_BASE_URL = 'http://127.0.0.1:8000';

export async function getDocuments() {
  const response = await fetch(`${API_BASE_URL}/documents`);
  if (!response.ok) {
    throw new Error('Failed to fetch document history');
  }
  const data = await response.json();

  // Explicitly return the documents array
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.documents)) return data.documents;
  return [];
}

export async function uploadPDF(file, subject = 'General') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('subject', subject);

  const response = await fetch(`${API_BASE_URL}/api/ingest`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed with status ${response.status}`);
  }

  return await response.json();
}

async function documentRequest(documentId, resource) {
  const response = await fetch(`${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}/${resource}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Failed to load ${resource}`);
  return data;
}

export function getDocumentOverview(documentId) {
  return documentRequest(documentId, 'overview');
}

export function getDocumentFlashcards(documentId) {
  return documentRequest(documentId, 'flashcards');
}

export async function askDocumentQuestion(question, documentId) {
  const response = await fetch(`${API_BASE_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, document_id: documentId || undefined }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Question answering failed.');
  return data;
}

export async function deleteDocument(docName) {
  const response = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(docName)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete document');
  return await response.json();
}

export async function askQuestion(question, subject = 'General') {
  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, subject }),
  });
  if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
  return await response.json();
}
