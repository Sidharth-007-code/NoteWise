const API_BASE = 'http://127.0.0.1:8000';

export async function askQuestion(question, subject) {
  const response = await fetch(`${API_BASE}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question, subject }),
  });
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
}

export async function getSubjects() {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }
  const data = await response.json();
  // Extract unique subjects from documents
  const subjects = new Set(['All']); // Always include All
  data.documents.forEach(doc => {
    if (doc.subject) {
      subjects.add(doc.subject);
    }
  });
  return Array.from(subjects);
}

export async function getDocuments() {
  const response = await fetch(`${API_BASE}/documents`);
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }
  return response.json();
}

export async function uploadPDF(file, subject) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('subject', subject);
  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to upload PDF');
  }
  return response.json();
}

export async function deleteDocument(docName) {
  const response = await fetch(`${API_BASE}/documents/${docName}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
  return response.json();
}