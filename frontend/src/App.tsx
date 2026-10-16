import React, { useState, useEffect } from 'react'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import Logo from './components/Logo'
import { getDocuments } from './api'
import './App.css'

export interface IndexedDoc {
  doc_name: string
  subject: string
  page_count?: number
}

function App() {
  const [documents, setDocuments] = useState<IndexedDoc[]>([])
  const [selectedDocument, setSelectedDocument] = useState<IndexedDoc | null>(null)
  const [subjectFilter, setSubjectFilter] = useState<string>('All')
  const [activeTab, setActiveTab] = useState<'tutor' | 'recall'>('tutor')

  // UI Drawer state for Left Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true)

  const refreshData = async () => {
    try {
      const data = await getDocuments()
      const docs = data.documents || []
      setDocuments(docs)
      return docs
    } catch (err) {
      console.error('Failed to load documents:', err)
      return []
    }
  }

  useEffect(() => {
    refreshData()
  }, [])

  const handleUploadSuccess = async () => {
    const updatedDocs = await refreshData()
    if (updatedDocs.length > 0) {
      setSelectedDocument(updatedDocs[updatedDocs.length - 1])
    }
  }

  const handleDocumentSelect = (doc: IndexedDoc) => {
    setSelectedDocument(doc)
  }

  return (
    <div className="App gemini-layout">
      {/* Header Bar */}
      <header className="App-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title="Toggle Document History"
          >
            ☰
          </button>
          <Logo size={24} />
        </div>

        {/* Top Shift Switcher (AI Tutor vs Active Recall) */}
        <div className="mode-switcher-pill">
          <button
            className={`switch-tab ${activeTab === 'tutor' ? 'active' : ''}`}
            onClick={() => setActiveTab('tutor')}
          >
            💬 AI Tutor
          </button>
          <button
            className={`switch-tab ${activeTab === 'recall' ? 'active' : ''}`}
            onClick={() => setActiveTab('recall')}
          >
            ⚡ Active Recall
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="rag-status-badge">
            ● Local RAG Engine Connected
          </span>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="workspace-body">
        {/* Left Sidebar: Document History */}
        <aside className={`gemini-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-inner">
            <div className="sidebar-header">
              <h3>Document History</h3>
              <span className="doc-count-badge">{documents.length}</span>
            </div>

            <LeftPanel
              mode="sidebar"
              documents={documents}
              selectedDocument={selectedDocument}
              subjectFilter={subjectFilter}
              onDocumentSelect={handleDocumentSelect}
              onSubjectChange={setSubjectFilter}
              onRefreshData={handleUploadSuccess}
            />
          </div>
        </aside>

        {/* Expanded Main Workspace */}
        <main 
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#090d16',
            padding: '24px 0 0 0',
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            maxWidth: '100%'
          }}
        >
          {/* Main Greeting Banner */}
          <div className="chat-welcome-header">
            <h2>Hello, Sidharth! 👋</h2>
            <p>
              {selectedDocument
                ? `Active Context: 📄 ${selectedDocument.doc_name}`
                : 'Upload or select a study PDF to begin querying NoteWise AI.'}
            </p>
          </div>

          {/* Core Chat Stream */}
          <div className="seamless-chat-container">
            <RightPanel
              activeTab={activeTab}
              subject={subjectFilter}
              onSubjectChange={setSubjectFilter}
              selectedDocument={selectedDocument}
              onRefreshData={handleUploadSuccess}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

export default App