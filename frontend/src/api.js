const API_BASE_URL = 'http://127.0.0.1:8000';

export async function getDocuments() {
  const response = await fetch(`${API_BASE_URL}/api/documents`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || 'Failed to load the document library.');
  }
  const data = await response.json();
  if (data && Array.isArray(data.documents)) return data.documents;
  throw new Error('The document library response was invalid.');
}

export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append('file', file);

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

export async function getDocumentFile(documentId) {
  const response = await fetch(`${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}/file`);
  if (!response.ok) {
    const error = new Error(`Failed to load document PDF (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return new Uint8Array(await response.arrayBuffer());
}

export function getDocumentPages(documentId) {
  return documentRequest(documentId, 'pages');
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

export async function deleteDocument(documentId) {
  const response = await fetch(`${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || 'Failed to delete document');
  return data;
}

export async function askQuestion(question) {
  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!response.ok) throw new Error(`Server Error: ${response.statusText}`);
  return await response.json();
}
