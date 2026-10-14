import { useState, useEffect } from 'react'

interface SearchResult {
  doc_name: string
  subject: string
  page_num: number
  snippet: string
  full_content: string
}

interface IndexedDoc {
  doc_name: string
  subject: string
  page_count: number
}

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [documents, setDocuments] = useState<IndexedDoc[]>([])
  const [subjects, setSubjects] = useState<string[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('All')
  const [uploadSubject, setUploadSubject] = useState<string>('Data Structures')
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)
  const [activePdf, setActivePdf] = useState<{ name: string; page: number } | null>(null)

  // AI Study Assistant Output State
  const [studyModal, setStudyModal] = useState<{ title: string; content: string } | null>(null)
  const [aiLoading, setAiLoading] = useState<boolean>(false)

  const fetchDocuments = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/documents')
      const data = await res.json()
      setDocuments(data.documents || [])
      setSubjects(data.subjects || [])
    } catch (err) {
      console.error('Failed to fetch document list:', err)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const formatDocTitle = (rawName: string) => {
    return rawName.replace(/__/g, ' ').replace(/_/g, ' ')
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setUploadStatus('Uploading and indexing PDF...')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('subject', uploadSubject)

    try {
      const response = await fetch('http://127.0.0.1:8000/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()
      if (response.ok) {
        setUploadStatus(`Success: ${data.message}`)
        setFile(null)
        fetchDocuments()
      } else {
        setUploadStatus(`Error: ${data.detail || 'Upload failed'}`)
      }
    } catch (err) {
      console.error(err)
      setUploadStatus('Failed to upload. Is backend running?')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteDoc = async (docName: string) => {
    if (!confirm(`Delete "${formatDocTitle(docName)}" from NoteWise?`)) return

    try {
      const res = await fetch(`http://127.0.0.1:8000/documents/${encodeURIComponent(docName)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        if (activePdf?.name === docName) setActivePdf(null)
        fetchDocuments()
      }
    } catch (err) {
      console.error('Failed to delete document:', err)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    try {
      const url = `http://127.0.0.1:8000/search?q=${encodeURIComponent(query)}&subject=${encodeURIComponent(selectedSubject)}`
      const response = await fetch(url)
      const data = await response.json()
      setResults(data.results || [])
    } catch (err) {
      console.error('Failed to fetch search results:', err)
    } finally {
      setLoading(false)
    }
  }

  const runStudyTool = async (toolType: 'summary' | 'quiz', item: SearchResult) => {
    setAiLoading(true)
    try {
      const res = await fetch('http://127.0.0.1:8000/ai/study-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_type: toolType,
          page_text: item.full_content,
          doc_name: item.doc_name,
          page_num: item.page_num
        })
      })
      const data = await res.json()
      setStudyModal({
        title: toolType === 'summary' ? `📝 Revision Summary — Page ${item.page_num}` : `⚡ Active Recall Quiz — Page ${item.page_num}`,
        content: data.content
      })
    } catch (err) {
      console.error('AI Study Tool failed:', err)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a' }}>NoteWise</h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0 0' }}>Source-first search & active study engine for PDFs.</p>
        </div>
        <div style={{ fontSize: '0.9rem', color: '#475569', backgroundColor: '#e2e8f0', padding: '0.4rem 0.8rem', borderRadius: '6px' }}>
          <b>{documents.length}</b> Documents Indexed
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: activePdf ? '1.1fr 1fr' : '1fr', gap: '1.5rem' }}>
        
        {/* Left Column */}
        <div>
          {/* Upload + Library Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            
            {/* Upload Card */}
            <section style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <h3 style={{ marginTop: 0, fontSize: '0.95rem', color: '#1e293b' }}>Upload Study PDF</h3>
              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                  style={{ fontSize: '0.85rem' }}
                />
                <input
                  type="text"
                  placeholder="Subject / Unit Tag (e.g. Data Structures)"
                  value={uploadSubject}
                  onChange={(e) => setUploadSubject(e.target.value)}
                  style={{ padding: '0.4rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                />
                <button
                  type="submit"
                  disabled={!file || isUploading}
                  style={{ padding: '0.5rem', cursor: file && !isUploading ? 'pointer' : 'not-allowed', marginTop: '0.25rem' }}
                >
                  {isUploading ? 'Indexing...' : 'Upload & Index'}
                </button>
              </form>
              {uploadStatus && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: uploadStatus.startsWith('Error') ? '#dc2626' : '#16a34a' }}>
                  {uploadStatus}
                </p>
              )}
            </section>

            {/* Indexed Library */}
            <section style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '8px', border: '1px solid #cbd5e1', maxHeight: '180px', overflowY: 'auto' }}>
              <h3 style={{ marginTop: 0, fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.5rem' }}>Indexed Library</h3>
              {documents.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>No documents uploaded yet.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {documents.map((doc, idx) => (
                    <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '170px' }}>
                        <span style={{ color: '#334155', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={doc.doc_name}>
                          📄 {formatDocTitle(doc.doc_name)}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>{doc.subject}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{doc.page_count}p</span>
                        <button
                          onClick={() => handleDeleteDoc(doc.doc_name)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.9rem', padding: '0 0.2rem' }}
                          title="Delete Document"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Search + Subject Filter */}
          <section>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{ padding: '0.75rem', fontSize: '0.9rem', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
              >
                <option value="All">All Subjects</option>
                {subjects.map((sub, i) => (
                  <option key={i} value={sub}>{sub}</option>
                ))}
              </select>

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search concepts (e.g., Circular Linked List, Proposition)..."
                style={{ flex: 1, padding: '0.75rem', fontSize: '1rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
              
              <button type="submit" style={{ padding: '0.75rem 1.25rem', fontSize: '1rem', cursor: 'pointer' }}>
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Results Cards with AI Actions */}
            <div>
              {results.length > 0 ? (
                results.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      backgroundColor: '#ffffff',
                      border: activePdf?.name === item.doc_name && activePdf?.page === item.page_num ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '1rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#2563eb', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ cursor: 'pointer' }} onClick={() => setActivePdf({ name: item.doc_name, page: item.page_num })}>
                          📄 {formatDocTitle(item.doc_name)}
                        </span>
                        <span style={{ marginLeft: '0.5rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {item.subject}
                        </span>
                      </div>
                      <span
                        onClick={() => setActivePdf({ name: item.doc_name, page: item.page_num })}
                        style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        Page {item.page_num} ↗
                      </span>
                    </div>

                    <div
                      style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.4', marginBottom: '0.75rem' }}
                      dangerouslySetInnerHTML={{ __html: item.snippet }}
                    />

                    {/* AI Study Toolbar */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => runStudyTool('summary', item)}
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', cursor: 'pointer', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      >
                        📝 Generate Summary
                      </button>
                      <button
                        onClick={() => runStudyTool('quiz', item)}
                        style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem', cursor: 'pointer', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      >
                        ⚡ Active Recall Questions
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                query && !loading && <p style={{ color: '#64748b' }}>No matching notes found for "{query}".</p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: PDF Viewer */}
        {activePdf && (
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', height: '82vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a' }}>
                {formatDocTitle(activePdf.name)} — <span style={{ color: '#2563eb' }}>Page {activePdf.page}</span>
              </h3>
              <button
                onClick={() => setActivePdf(null)}
                style={{ padding: '0.25rem 0.5rem', cursor: 'pointer', border: '1px solid #cbd5e1', borderRadius: '4px' }}
              >
                Close Viewer ✕
              </button>
            </div>
            
            <iframe
              key={`${activePdf.name}-${activePdf.page}`}
              src={`http://127.0.0.1:8000/pdf/${encodeURIComponent(activePdf.name)}#page=${activePdf.page}`}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px' }}
              title="PDF Viewer"
            />
          </div>
        )}

      </div>

      {/* AI Study Output Modal */}
      {(studyModal || aiLoading) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '8px', maxWidth: '550px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            {aiLoading ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>Analyzing page context and generating study materials...</p>
            ) : (
              <div>
                <h3 style={{ marginTop: 0, color: '#0f172a' }}>{studyModal?.title}</h3>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: '#334155', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '6px', fontSize: '0.9rem' }}>
                  {studyModal?.content}
                </pre>
                <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                  <button
                    onClick={() => setStudyModal(null)}
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '4px' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default App