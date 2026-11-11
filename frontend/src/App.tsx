import React, { useState, useEffect } from 'react';
import MathText from './components/MathText';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import { AppShell } from './components/ui/AppShell';
import { Button } from './components/ui/Button';
import { Folder } from 'lucide-react';
import { getDocumentOverview, getDocuments } from './api';
import './App.css';
import './OverviewPane.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('tutor');
  const [promptText, setPromptText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [showExcerpt, setShowExcerpt] = useState(false);

  const loadDocuments = async () => {
    setDocumentsLoading(true);
    setDocumentsError('');
    try {
      const records = await getDocuments();
      setUploadedFiles((current) => {
        const existing = new Map(current.map((file) => [file.id, file]));
        return records.map((record) => {
          const prior = existing.get(record.document_id) || {};
          return {
            ...prior,
            id: record.document_id,
            name: record.filename,
            pageCount: record.page_count,
            ocrUsed: record.ocr_used,
            extractedPages: record.extracted_pages,
            createdAt: record.created_at,
            hasOverview: record.has_overview,
            hasFlashcards: record.has_flashcards,
            status: prior.status || 'Indexed',
          };
        });
      });
      setSelectedFile((current) => {
        if (!current) return current;
        const record = records.find((item) => item.document_id === current.id);
        if (!record) return null;
        return {
          ...current,
          id: record.document_id,
          name: record.filename,
          pageCount: record.page_count,
          ocrUsed: record.ocr_used,
          extractedPages: record.extracted_pages,
          createdAt: record.created_at,
          hasOverview: record.has_overview,
          hasFlashcards: record.has_flashcards,
        };
      });
    } catch (error) {
      setDocumentsError(error.message || 'Could not load the document library.');
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => { loadDocuments(); }, []);

  useEffect(() => {
    let cancelled = false;

    setOverview(selectedFile?.overview || null);
    setOverviewError(selectedFile?.overviewError || '');
    setShowExcerpt(false);

    if (!selectedFile?.id || selectedFile.overview) {
      setOverviewLoading(false);
      return undefined;
    }

    setOverviewLoading(true);

    getDocumentOverview(selectedFile.id)
      .then((data) => {
        if (cancelled) return;

        setOverview(data);

        setUploadedFiles((files) =>
          files.map((file) =>
            file.id === selectedFile.id
              ? { ...file, overview: data, status: 'Indexed' }
              : file
          )
        );

        setSelectedFile((current) =>
          current?.id === selectedFile.id
            ? { ...current, overview: data, status: 'Indexed' }
            : current
        );
      })
      .catch((error) => {
        if (!cancelled) {
          setOverviewError(error.message || 'Could not load the document overview.');
        }
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFile?.id, selectedFile?.overview, selectedFile?.overviewError]);

  const retryOverview = async () => {
    if (!selectedFile?.id) return;

    const documentId = selectedFile.id;
    setOverviewError('');
    setOverviewLoading(true);

    try {
      const data = await getDocumentOverview(documentId);

      setOverview(data);

      setUploadedFiles((files) =>
        files.map((file) =>
          file.id === documentId
            ? { ...file, overview: data, status: 'Indexed' }
            : file
        )
      );

      setSelectedFile((current) =>
        current?.id === documentId
            ? { ...current, overview: data, status: 'Indexed' }
          : current
      );
    } catch (error) {
      setOverviewError(error.message || 'Could not load the document overview.');
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleSendPromptToTutor = (text) => {
    setActiveTab('tutor');
    setPromptText(text);
  };

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      selectedFileName={selectedFile ? selectedFile.name : null}
    >
      <div className="flex-1 flex overflow-hidden z-10 w-full h-full" style={{ backgroundColor: 'var(--nw-bg)' }}>
        {/* Left Cognitive Library Panel */}
        <LeftPanel
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          documentsLoading={documentsLoading}
          documentsError={documentsError}
          onRetryDocuments={loadDocuments}
        />

        {/* Center Document Overview Workspace Pane */}
        <section className="nw-overview-pane">
          <div className="nw-overview-topbar">
            <div className="nw-overview-breadcrumb">
              <span className="nw-overview-breadcrumb__icon">
                <Folder size={16} />
              </span>
              <span>{selectedFile ? 'Selected document' : 'Document workspace'}</span>
              <span className="nw-overview-breadcrumb__divider">/</span>
              <span className="nw-overview-breadcrumb__name">
                {selectedFile ? selectedFile.name : 'No document selected'}
              </span>
            </div>

            <span className="nw-overview-page-badge">
              {selectedFile
                ? `Extracted ${overview?.extracted_pages ?? '—'} of ${overview?.page_count ?? selectedFile.pageCount ?? '—'} pages`
                : 'No document'}
            </span>
          </div>

          <div className="nw-overview-scroll">
            <div className="nw-overview-card">
              <div className="nw-overview-header">
                <div>
                  <div className="nw-overview-status">
                    <span className="nw-overview-badge">DOCUMENT OVERVIEW</span>
                    {selectedFile && (
                      <span
                        className={`nw-overview-status-text ${
                          overview?.processing_status === 'partial'
                            ? 'nw-overview-status--partial'
                            : 'nw-overview-status--processed'
                        }`}
                      >
                        {overview?.processing_status === 'partial'
                          ? 'Partial extraction'
                          : overview
                            ? 'Processed'
                            : 'Processing'}
                      </span>
                    )}
                  </div>

                  <h1 className="nw-overview-title">
                    {overview?.title ||
                      selectedFile?.name ||
                      'Upload a PDF to view its context'}
                  </h1>
                </div>

                {overviewError && (
                  <button
                    onClick={retryOverview}
                    disabled={overviewLoading}
                    className="nw-overview-retry-btn"
                  >
                    {overviewLoading ? 'Retrying…' : 'Retry'}
                  </button>
                )}
              </div>

              {overviewLoading && (
                <p className="nw-overview-loading">
                  Building an overview from the extracted document text…
                </p>
              )}

              {overviewError && (
                <p role="alert" className="nw-overview-error">
                  {overviewError}
                </p>
              )}

              {!selectedFile && (
                <p className="nw-overview-empty">
                  Select or upload a PDF to see its full document summary, key
                  topics, and extracted text.
                </p>
              )}

              {overview && (
                <>
                  {/* Full document summary: supports math */}
                  {overview.summary && (
                    <div className="nw-overview-summary">
                      <MathText>{overview.summary}</MathText>
                    </div>
                  )}

                  {/* Topic-by-topic study guide */}
                  {overview.topic_summaries?.length > 0 && (
                    <section className="nw-topics-section">
                      <div className="nw-topics-header">
                        <h2 className="nw-topics-title">
                          Topic-by-topic study guide
                        </h2>
                        <span className="nw-topics-count">
                          {overview.topic_summaries.length} topics
                        </span>
                      </div>

                      <div className="nw-topics-grid">
                        {overview.topic_summaries.map((item, index) => (
                          <article
                            key={`${item.topic}-${index}`}
                            className="nw-topic-card"
                          >
                            <div className="nw-topic-header">
                              <span className="nw-topic-number">
                                {index + 1}
                              </span>

                              <div className="nw-topic-info">
                                <h3 className="nw-topic-name">
                                  <MathText>{item.topic || 'Untitled topic'}</MathText>
                                </h3>

                                {item.pages?.length > 0 && (
                                  <p className="nw-topic-pages">
                                    Page{item.pages.length > 1 ? 's' : ''}{' '}
                                    {item.pages.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            {item.summary && (
                              <div className="nw-topic-summary">
                                <MathText>{item.summary}</MathText>
                              </div>
                            )}

                            {item.key_points?.length > 0 && (
                              <ul className="nw-topic-points">
                                {item.key_points.map((point, pointIndex) => (
                                  <li key={pointIndex} className="nw-topic-point">
                                    <span className="nw-topic-bullet">•</span>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <MathText>{point}</MathText>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {item.example && (
                              <div className="nw-topic-example">
                                <p className="nw-topic-example-label">
                                  Example / application
                                </p>
                                <div className="nw-topic-example-content">
                                  <MathText>{item.example}</MathText>
                                </div>
                              </div>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Fallback for documents without topic summaries */}
                  {!overview.topic_summaries?.length &&
                    overview.key_topics?.length > 0 && (
                      <div className="nw-fallback-topics">
                        <p className="nw-topics-title">Key topics</p>
                        <div className="nw-fallback-topics__chips">
                          {overview.key_topics.map((topic, index) => (
                            <span key={`${topic}-${index}`} className="nw-fallback-chip">
                              <MathText>{topic}</MathText>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Important concepts and formulas */}
                  {overview.important_concepts?.length > 0 && (
                    <div className="nw-concepts-section">
                      <p className="nw-topics-title">Concepts and formulas detected</p>
                      <ul className="nw-concepts-list">
                        {overview.important_concepts.map((concept, index) => (
                          <li key={`${concept}-${index}`}>
                            <MathText>{concept}</MathText>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* OCR Notice */}
                  {overview.ocr_used && (
                    <div className="nw-ocr-notice">
                      OCR was used to extract this document. Extracted text is
                      available for {overview.extracted_pages ?? 'some'} of{' '}
                      {overview.page_count ?? selectedFile?.pageCount ?? '—'} pages.
                      Mathematical symbols may need verification against the
                      original PDF.
                    </div>
                  )}

                  {/* Extracted text excerpt */}
                  <div className="nw-excerpt-section">
                    <button
                      type="button"
                      onClick={() => setShowExcerpt((open) => !open)}
                      className="nw-excerpt-toggle"
                    >
                      {showExcerpt
                        ? 'Hide extracted text excerpt'
                        : 'Show extracted text excerpt'}
                    </button>

                    {showExcerpt && overview.excerpt && (
                      <blockquote className="nw-excerpt-box">
                        <span className="nw-excerpt-label">
                          EXTRACTED TEXT · PAGE {overview.excerpt.page}
                        </span>
                        <div className="nw-excerpt-text">
                          <MathText>{overview.excerpt.text || ''}</MathText>
                        </div>
                      </blockquote>
                    )}
                  </div>

                  {/* Study actions */}
                  <div className="nw-study-actions">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        handleSendPromptToTutor(
                          `Summarize the key ideas in ${selectedFile.name}`
                        )
                      }
                    >
                      Ask Tutor
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveTab('recall')}
                    >
                      Study with flashcards
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Right Copilot Studio (Kept Mounted) */}
        <RightPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          initialPrompt={promptText}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
        />
      </div>
    </AppShell>
  );
}
