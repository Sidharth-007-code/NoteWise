const API_BASE_URL = 'http://127.0.0.1:8000';

export async function askQuestion(question, subject = 'General') {
  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, subject }),
  });

  if (!response.ok) {
    throw new Error(`Server Error: ${response.statusText}`);
  }

  return await response.json();
}

export async function uploadPDF(file, subject = 'General') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('subject', subject);

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return await response.json();
}

export async function getDocuments() {
  const response = await fetch(`${API_BASE_URL}/documents`);
  if (!response.ok) {
    throw new Error('Failed to fetch document history');
  }
  return await response.json();
}

export async function deleteDocument(docName) {
  const response = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(docName)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
  return await response.json();
}

export async function fetchStudyTools(toolType, prompt, docName, count = 1) {
  const response = await fetch(`${API_BASE_URL}/study-tools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool_type: toolType, prompt, doc_name: docName, count }),
  });

  if (!response.ok) {
    return { content: null };
  }

  return await response.json();
}