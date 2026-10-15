import React, { useState, useEffect } from 'react';
import { searchNotes } from '../api';

const CenterPanel = ({ selectedDocument }) => {
  const [pdfSrc, setPdfSrc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedDocument) {
      const src = `http://127.0.0.1:8000/pdf/${selectedDocument.doc_name}#page=${selectedDocument.page_num || 1}`;
      setPdfSrc(src);
      // Reset search when document changes
      setSearchQuery('');
      setSearchResults([]);
    } else {
      setPdfSrc('');
    }
  }, [selectedDocument]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    setError('');
    try {
      // We need to know the subject filter from somewhere; we'll assume we can get it from context or prop.
      // For simplicity, we'll search across all subjects (or we could pass the current subject filter as prop).
      // We'll adjust: we'll add a prop for currentSubjectFilter later.
      // For now, we'll search without subject filter.
      const response = await fetch(`http://127.0.0.1:8000/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (err) {
      setError(err.message);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePageJump = (pageNum) => {
    if (selectedDocument) {
      const src = `http://127.0.0.1:8000/pdf/${selectedDocument.doc_name}#page=${pageNum}`;
      setPdfSrc(src);
    }
  };

  return (
    <div className="center-panel">
      {selectedDocument ? (
        <>
          <div className="viewer-header">
            <h2>{selectedDocument.doc_name}</h2>
            <div className="search-controls">
              <form onSubmit={handleSearch} className="search-form">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search in document..."
                  disabled={searchLoading}
                />
                <button type="submit" disabled={searchLoading}>
                  {searchLoading ? 'Searching...' : 'Search'}
                </button>
              </form>
              {searchLoading && <span className="loading">…</span>}
              {error && <span className="error">{error}</span>}
            </div>
          </div>
          <div className="viewer-body">
            <iframe
              src={pdfSrc}
              title="PDF viewer"
              style={{ width: '100%', height: 'calc(100% - 60px)', border: 'none' }}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="search-results">
              <strong>Search results:</strong>
              <ul>
                {searchResults.slice(0, 5).map((result, idx) => (
                  <li key={idx} onClick={() => handlePageJump(result.page_num)}>
                    {result.doc_name} p.{result.page_num}: {result.snippet}
                  </li>
                ))}
                {searchResults.length > 5 && (
                  <li>…and {searchResults.length - 5} more</li>
                )}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="no-document">
          Select a document from the list to view it here.
        </div>
      )}
    </div>
  );
};

export default CenterPanel;