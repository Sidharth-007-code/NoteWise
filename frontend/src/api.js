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
