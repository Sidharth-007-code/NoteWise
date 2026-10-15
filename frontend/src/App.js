import React, { useState, useEffect } from 'react';
import LeftPanel from './components/LeftPanel';
import CenterPanel from './components/CenterPanel';
import RightPanel from './components/RightPanel';
import './App.css';

function App() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [subjectFilter, setSubjectFilter] = useState('All');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docsResp = await fetch('http://127.0.0.1:8000/documents');
        if (!docsResp.ok) {
          throw new Error('Failed to fetch documents');
        }
        const docsData = await docsResp.json();
        setDocuments(docsData.documents || []);

        const subjResp = await fetch('http://127.0.0.1:8000/documents');
        if (!subjResp.ok) {
          throw new Error('Failed to fetch subjects');
        }
        const subjData = await subjResp.json();
        const subjects = new Set(['All']);
        (subjData.documents || []).forEach(doc => {
          if (doc.subject) {
            subjects.add(doc.subject);
          }
        });
        // We don't have a separate state for subjects in App, but we need to pass the list to LeftPanel and RightPanel?
        // Actually, LeftPanel and RightPanel get the subjects from their own api calls (they call getSubjects).
        // So we don't need to pass the subjects list as props. We'll keep it as is.
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    fetchData();
  }, []);

  const handleDocumentSelect = (doc) => {
    // Toggle selection if clicking the same document? We'll just set it.
    setSelectedDocument(doc);
  };

  const handleSubjectChange = (newSubject) => {
    setSubjectFilter(newSubject);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>NoteWise</h1>
        <p>Source-First Local PDF Study Assistant</p>
      </header>
      <div className="app-container">
        <LeftPanel
          documents={documents}
          selectedDocument={selectedDocument}
          subjectFilter={subjectFilter}
          onDocumentSelect={handleDocumentSelect}
          onSubjectChange={handleSubjectChange}
        />
        <CenterPanel selectedDocument={selectedDocument} />
        <RightPanel subject={subjectFilter} onSubjectChange={handleSubjectChange} />
      </div>
    </div>
  );
}

export default App;