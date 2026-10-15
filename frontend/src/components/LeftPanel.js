import React, { useState, useEffect } from 'react';
import { getDocuments, uploadPDF, deleteDocument, getSubjects } from '../api';

const LeftPanel = ({ onDocumentSelect, onSubjectChange, selectedSubject, selectedDocument }) => {
  const [documents, setDocuments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [subjects, setSubjects] = useState(['All']);
  const [filterSubject, setFilterSubject] = useState('All');
  const [selectedFile, setSelectedFile] = useState(null);
  const [subjectInput, setSubjectInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docs = await getDocuments();
        setDocuments(docs.documents || []);
        const subj = await getSubjects();
        setSubjects(subj);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Sync the filter subject with the prop from App (if we want to control it from App)
    // We'll let the App control the filter subject via the onSubjectChange callback.
    // We'll also update the local state when the prop changes.
    setFilterSubject(selectedSubject);
  }, [selectedSubject]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubjectChange = (e) => {
    setSubjectInput(e.target.value);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a PDF file');
      return;
    }
    if (!subjectInput.trim()) {
      setUploadError('Please enter a subject');
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      await uploadPDF(selectedFile, subjectInput.trim());
      // Refresh documents and subjects
      const docs = await getDocuments();
      setDocuments(docs.documents || []);
      const subj = await getSubjects();
      setSubjects(subj);
      setSelectedFile(null);
      setSubjectInput('');
      // Optionally, notify parent that subjects may have changed
      onSubjectChange && onSubjectChange('All'); // Reset filter to All after upload? Or keep current?
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docName) => {
    if (window.confirm(`Delete document "${docName}"?`)) {
      try {
        await deleteDocument(docName);
        // Refresh documents and subjects
        const docs = await getDocuments();
        setDocuments(docs.documents || []);
        const subj = await getSubjects();
        setSubjects(subj);
        // If the deleted document was the currently selected one, clear selection
        if (selectedDocument && selectedDocument.doc_name === docName) {
          onDocumentSelect(null);
        }
      } catch (err) {
        alert(`Failed to delete document: ${err.message}`);
      }
    }
  };

  const handleDocumentClick = (doc) => {
    onDocumentSelect(doc);
  };

  const filteredDocuments = documents.filter(
    doc => filterSubject === 'All' || doc.subject === filterSubject
  );

  return (
    <div className="left-panel">
      <h2>Upload PDF</h2>
      <form onSubmit={handleUpload} className="upload-form">
        <div>
          <label htmlFor="pdf-input">PDF File:</label>
          <input
            type="file"
            id="pdf-input"
            accept=".pdf"
            onChange={handleFileChange}
            required
            disabled={uploading}
          />
        </div>
        <div>
          <label htmlFor="subject-input">Subject:</label>
          <input
            type="text"
            id="subject-input"
            value={subjectInput}
            onChange={handleSubjectChange}
            required
            disabled={uploading}
          />
        </div>
        <button type="submit" disabled={uploading || !selectedFile || !subjectInput.trim()}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        {uploadError && <div className="error">{uploadError}</div>}
      </form>

      <h2>Documents</h2>
      <div>
        <label htmlFor="subject-filter">Filter by Subject:</label>
        <select
          id="subject-filter"
          value={filterSubject}
          onChange={(e) => {
            setFilterSubject(e.target.value);
            onSubjectChange && onSubjectChange(e.target.value);
          }}
          disabled={uploading}
        >
          {subjects.map(subj => (
            <option key={subj} value={subj}>
              {subj}
            </option>
          ))}
        </select>
      </div>

      <ul className="document-list">
        {filteredDocuments.length === 0 ? (
          <li>No documents found.</li>
        ) : (
          filteredDocuments.map(doc => (
            <li
              key={doc.doc_name}
              className={`doc-item ${selectedDocument && selectedDocument.doc_name === doc.doc_name ? 'selected' : ''}`}
              onClick={() => handleDocumentClick(doc)}
            >
              <span className="doc-info">
                <strong>{doc.doc_name}</strong> ({doc.subject || 'No subject'})
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering document select
                  handleDelete(doc.doc_name);
                }}
                className="delete-btn"
                title="Delete"
              >
                ×
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default LeftPanel;