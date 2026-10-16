import React, { useState } from 'react';
import { uploadPDF, deleteDocument } from '../api';

export default function LeftPanel({
  documents,
  selectedDocument,
  subjectFilter,
  onDocumentSelect,
  onSubjectChange,
  onRefreshData,
  mode = 'sidebar'
}) {
  const [file, setFile] = useState(null);
  const [subjectInput, setSubjectInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      await uploadPDF(file, subjectInput || 'General');
      setFile(null);
      setSubjectInput('');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (e, docName) => {
    e.stopPropagation();
    try {
      await deleteDocument(docName);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const filteredDocs = subjectFilter === 'All'
    ? documents
    : documents.filter(d => d.subject === subjectFilter);

  const uniqueSubjects = ['All', ...Array.from(new Set(documents.map(d => d.subject)))];

  // Mode 1: Render Center Upload Dropzone
  if (mode === 'upload') {
    return (
      <div className="upload-box-wrapper">
        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div 
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '10px',
              padding: '32px 16px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface)',
              cursor: 'pointer'
            }}
            onClick={() => document.getElementById('pdf-file-input').click()}
          >
            <input 
              id="pdf-file-input"
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📂</div>
            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
              {file ? file.name : 'Choose PDF File'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Click or drag to upload local notes
            </div>
          </div>

          <input
            type="text"
            placeholder="Subject Tag (e.g. AIML, DSA, OS)"
            value={subjectInput}
            onChange={(e) => setSubjectInput(e.target.value)}
          />

          <button type="submit" disabled={!file || uploading}>
            {uploading ? 'Indexing PDF...' : 'Upload & Index PDF'}
          </button>
        </form>
      </div>
    );
  }

  // Mode 2: Render Sidebar History & Filter List
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
          FILTER BY SUBJECT
        </label>
        <select value={subjectFilter} onChange={(e) => onSubjectChange(e.target.value)}>
          {uniqueSubjects.map((subj) => (
            <option key={subj} value={subj}>{subj}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filteredDocs.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
            No indexed documents found.
          </div>
        ) : (
          filteredDocs.map((doc) => {
            const isSelected = selectedDocument?.doc_name === doc.doc_name;
            return (
              <div
                key={doc.doc_name}
                onClick={() => onDocumentSelect(doc)}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    📄 {doc.doc_name}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                    {doc.subject}
                  </span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, doc.doc_name)}
                  style={{
                    height: '24px',
                    width: '24px',
                    padding: 0,
                    fontSize: '0.75rem',
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    border: 'none'
                  }}
                  title="Delete Document"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}