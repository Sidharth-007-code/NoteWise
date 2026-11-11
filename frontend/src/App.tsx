
import React, { useState, useEffect } from 'react';
import MathText from './components/MathText';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import './App.css';
import { getDocumentOverview } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('tutor');
  const [promptText, setPromptText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [showExcerpt, setShowExcerpt] = useState(false);

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
              ? { ...file, overview: data, status: 'Processed' }
              : file
          )
        );

        setSelectedFile((current) =>
          current?.id === selectedFile.id
            ? { ...current, overview: data, status: 'Processed' }
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
            ? { ...file, overview: data, status: 'Processed' }
            : file
        )
      );

      setSelectedFile((current) =>
        current?.id === documentId
          ? { ...current, overview: data, status: 'Processed' }
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
    <div className="bg-[#0f131d] text-[#dfe2f1] font-sans min-h-screen relative overflow-hidden flex flex-col h-screen antialiased">
      {/* Header */}
      <header className="bg-[#0a0e18]/80 backdrop-blur-md text-[#c0c1ff] sticky top-0 z-50 border-b border-[#464554]/30 flex justify-between items-center w-full px-8 h-16 shrink-0">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setActiveTab('tutor')}
        >
          <div className="w-9 h-9 rounded-lg bg-[#262a35] border border-[#464554]/40 flex items-center justify-center text-[#c0c1ff]">
            <span className="material-symbols-outlined text-[20px]">
              hub
            </span>
          </div>

          <span className="text-xl font-bold tracking-tight text-[#c0c1ff]">
            NoteWise
          </span>

          <span className="text-xs px-2 py-0.5 rounded-full bg-[#c0c1ff]/10 text-[#c0c1ff] border border-[#c0c1ff]/20 font-mono">
            1.0 test
          </span>
        </div>

        <nav className="flex items-center gap-7 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('tutor')}
            className={`transition-colors ${
              activeTab === 'tutor'
                ? 'text-[#c0c1ff] border-b-2 border-[#c0c1ff] pb-1'
                : 'text-[#c7c4d7] hover:text-[#dfe2f1]'
            }`}
          >
            AI Tutor
          </button>

          <button
            onClick={() => setActiveTab('recall')}
            className={`transition-colors ${
              activeTab === 'recall'
                ? 'text-[#c0c1ff] border-b-2 border-[#c0c1ff] pb-1'
                : 'text-[#c7c4d7] hover:text-[#dfe2f1]'
            }`}
          >
            Active Recall (3D)
          </button>
        </nav>
      </header>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden z-10">
        <LeftPanel
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
        />

        {/* Document overview */}
        <section className="flex-1 flex flex-col border-r border-[#464554]/30 overflow-hidden bg-[#0a0e18]/40 backdrop-blur-sm">
          <div className="h-14 border-b border-[#464554]/25 px-6 flex items-center justify-between bg-[#171b26]/50 shrink-0">
            <div className="flex items-center gap-3 text-xs">
              <span className="material-symbols-outlined text-purple-300 text-[20px]">
                folder
              </span>

              <span className="text-[#908fa0]">
                {selectedFile ? 'Selected document' : 'Document workspace'}
              </span>

              <span className="text-[#464554]">/</span>

              <span className="font-medium text-[#dfe2f1]">
                {selectedFile ? selectedFile.name : 'No document selected'}
              </span>
            </div>

            <span className="px-2 py-0.5 rounded bg-[#1c1f2a] text-xs font-mono text-[#908fa0] border border-[#464554]/40">
              {selectedFile
                ? `Extracted ${overview?.extracted_pages ?? '—'} of ${overview?.page_count ?? selectedFile.pageCount ?? '—'} pages`
                : 'No document'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-5 rounded-xl bg-[#171b26]/80 border border-[#464554]/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8083ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/30">
                      DOCUMENT OVERVIEW
                    </span>

                    {selectedFile && (
                      <span
                        className={`text-[10px] ${
                          overview?.processing_status === 'partial'
                            ? 'text-amber-300'
                            : 'text-emerald-300'
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

                  <h1 className="text-xl font-bold text-[#dfe2f1] tracking-tight">
                    {overview?.title ||
                      selectedFile?.name ||
                      'Upload a PDF to view its context'}
                  </h1>
                </div>

                {overviewError && (
                  <button
                    onClick={retryOverview}
                    disabled={overviewLoading}
                    className="text-xs text-[#c0c1ff] underline disabled:opacity-50"
                  >
                    {overviewLoading ? 'Retrying…' : 'Retry'}
                  </button>
                )}
              </div>

              {overviewLoading && (
                <p className="text-sm text-[#908fa0] mt-4">
                  Building an overview from the extracted document text…
                </p>
              )}

              {overviewError && (
                <p role="alert" className="text-sm text-rose-300 mt-4">
                  {overviewError}
                </p>
              )}

              {!selectedFile && (
                <p className="text-sm text-[#908fa0] mt-3">
                  Select or upload a PDF to see its full document summary,
                  key topics, and extracted text.
                </p>
              )}

              {overview && (
                <>
                  {/* Full document summary: supports math */}
                  {overview.summary && (
                    <div className="text-sm text-[#dfe2f1] mt-4 leading-relaxed">
                      <MathText>{overview.summary}</MathText>
                    </div>
                  )}

                  {/* Topic-by-topic study guide */}
                  {overview.topic_summaries?.length > 0 && (
                    <section className="mt-6">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[#908fa0]">
                          Topic-by-topic study guide
                        </p>

                        <span className="text-[10px] text-[#908fa0]">
                          {overview.topic_summaries.length} topics
                        </span>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {overview.topic_summaries.map((item, index) => (
                          <article
                            key={`${item.topic}-${index}`}
                            className="rounded-xl bg-[#101521] border border-[#55556d]/70 p-4 shadow-sm"
                          >
                            <div className="flex items-start gap-3">
                              <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg bg-[#8083ff]/15 border border-[#8083ff]/35 text-[#c0c1ff] text-xs font-bold">
                                {index + 1}
                              </span>

                              <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-bold text-[#dfe2f1] leading-snug">
                                  <MathText>{item.topic || 'Untitled topic'}</MathText>
                                </h3>

                                {item.pages?.length > 0 && (
                                  <p className="text-[10px] text-[#908fa0] mt-1">
                                    Page{item.pages.length > 1 ? 's' : ''}{' '}
                                    {item.pages.join(', ')}
                                  </p>
                                )}
                              </div>
                            </div>

                            {item.summary && (
                              <div className="text-xs text-[#dfe2f1] leading-relaxed mt-3">
                                <MathText>{item.summary}</MathText>
                              </div>
                            )}

                            {item.key_points?.length > 0 && (
                              <ul className="mt-3 space-y-1.5">
                                {item.key_points.map((point, pointIndex) => (
                                  <li
                                    key={pointIndex}
                                    className="flex gap-2 text-xs text-[#c7c4d7] leading-relaxed"
                                  >
                                    <span className="text-[#4cd7f6]">•</span>
                                    <div className="min-w-0 flex-1">
                                      <MathText>{point}</MathText>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {item.example && (
                              <div className="mt-3 rounded-lg bg-[#1b2230] border border-[#464554]/70 p-3">
                                <p className="text-[9px] uppercase tracking-wider font-bold text-[#4cd7f6] mb-1">
                                  Example / application
                                </p>

                                <div className="text-xs text-[#c7c4d7] leading-relaxed">
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
                      <div className="mt-4">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[#908fa0] mb-2">
                          Key topics
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {overview.key_topics.map((topic, index) => (
                            <span
                              key={`${topic}-${index}`}
                              className="px-2 py-1 rounded bg-[#262a35] border border-[#464554]/40 text-xs text-[#c7c4d7]"
                            >
                              <MathText>{topic}</MathText>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Important concepts and formulas */}
                  {overview.important_concepts?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-[#908fa0] mb-2">
                        Concepts and formulas detected
                      </p>

                      <ul className="list-disc pl-5 space-y-2 text-xs text-[#c7c4d7]">
                        {overview.important_concepts.map((concept, index) => (
                          <li key={`${concept}-${index}`}>
                            <MathText>{concept}</MathText>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {overview.ocr_used && (
                    <p className="mt-3 text-[11px] text-amber-200">
                      OCR was used to extract this document. Extracted text is
                      available for {overview.extracted_pages ?? 'some'} of{' '}
                      {overview.page_count ?? selectedFile?.pageCount ?? '—'} pages.
                      Mathematical symbols may need verification against the
                      original PDF.
                    </p>
                  )}

                  {/* Extracted text excerpt */}
                  <div className="mt-4 border-t border-[#464554]/30 pt-3">
                    <button
                      onClick={() => setShowExcerpt((open) => !open)}
                      className="text-xs font-semibold text-[#4cd7f6]"
                    >
                      {showExcerpt
                        ? 'Hide extracted text excerpt'
                        : 'Show extracted text excerpt'}
                    </button>

                    {showExcerpt && overview.excerpt && (
                      <blockquote className="mt-3 p-3 rounded-lg bg-[#0a0e18]/80 border-l-2 border-[#4cd7f6] text-xs text-[#c7c4d7]">
                        <span className="block text-[10px] text-[#4cd7f6] mb-2">
                          EXTRACTED TEXT · PAGE {overview.excerpt.page}
                        </span>

                        <div className="whitespace-pre-wrap break-words">
                          <MathText>{overview.excerpt.text || ''}</MathText>
                        </div>
                      </blockquote>
                    )}
                  </div>

                  {/* Study actions */}
                  <div className="pt-4 flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() =>
                        handleSendPromptToTutor(
                          `Summarize the key ideas in ${selectedFile.name}`
                        )
                      }
                      className="px-3 py-1 rounded-md bg-[#8083ff]/20 hover:bg-[#8083ff]/40 text-[#c0c1ff] border border-[#c0c1ff]/30 text-xs font-semibold"
                    >
                      Ask Tutor
                    </button>

                    <button
                      onClick={() => setActiveTab('recall')}
                      className="px-3 py-1 rounded-md bg-[#1c1f2a] hover:bg-[#262a35] text-[#c7c4d7] border border-[#464554]/30 text-xs font-semibold"
                    >
                      Study with flashcards
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Right Copilot Studio */}
        <RightPanel
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          initialPrompt={promptText}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
        />
      </div>
    </div>
  );
}
