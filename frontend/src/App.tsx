import React, { useState, useEffect } from 'react';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import './App.css';
import { getDocumentOverview } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('tutor');
  const [activeSubject, setActiveSubject] = useState('All');
  const [promptText, setPromptText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [showExcerpt, setShowExcerpt] = useState(false);

  useEffect(() => {
    setOverview(selectedFile?.overview || null);
    setOverviewError(selectedFile?.overviewError || '');
    setShowExcerpt(false);
    if (!selectedFile?.id) return undefined;
    if (selectedFile.overview) return undefined;
    let cancelled = false;
    setOverviewLoading(true);
    getDocumentOverview(selectedFile.id)
      .then((data) => {
        if (cancelled) return;
        setOverview(data);
        setUploadedFiles((files) => files.map((file) => file.id === selectedFile.id ? { ...file, overview: data, status: 'Processed' } : file));
      })
      .catch((error) => { if (!cancelled) setOverviewError(error.message); })
      .finally(() => { if (!cancelled) setOverviewLoading(false); });
    return () => { cancelled = true; };
  }, [selectedFile?.id, selectedFile?.overview, selectedFile?.overviewError]);

  const retryOverview = () => {
    if (!selectedFile?.id) return;
    setOverviewError('');
    setOverviewLoading(true);
    getDocumentOverview(selectedFile.id)
      .then((data) => { setOverview(data); setUploadedFiles((files) => files.map((file) => file.id === selectedFile.id ? { ...file, overview: data, status: 'Processed' } : file)); })
      .catch((error) => setOverviewError(error.message))
      .finally(() => setOverviewLoading(false));
  };

  const handleSendPromptToTutor = (text) => {
    setActiveTab('tutor');
    setPromptText(text);
  };

  return (
    <div className="bg-[#0f131d] text-[#dfe2f1] font-sans min-h-screen relative overflow-hidden flex flex-col h-screen antialiased">
      {/* Header synchronized with Right Panel */}
      <header className="bg-[#0a0e18]/80 backdrop-blur-md text-[#c0c1ff] sticky top-0 z-50 border-b border-[#464554]/30 flex justify-between items-center w-full px-8 h-16 shrink-0">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('tutor')}>
          <div className="w-9 h-9 rounded-lg bg-[#262a35] border border-[#464554]/40 flex items-center justify-center text-[#c0c1ff]">
            <span className="material-symbols-outlined text-[20px]">hub</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-[#c0c1ff]">NoteWise</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#c0c1ff]/10 text-[#c0c1ff] border border-[#c0c1ff]/20 font-mono">
            v2.4
          </span>
        </div>

        <nav className="flex items-center gap-7 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('tutor')}
            className={`transition-colors ${
              activeTab === 'tutor' ? 'text-[#c0c1ff] border-b-2 border-[#c0c1ff] pb-1' : 'text-[#c7c4d7] hover:text-[#dfe2f1]'
            }`}
          >
            AI Tutor
          </button>
          <button
            onClick={() => setActiveTab('recall')}
            className={`transition-colors ${
              activeTab === 'recall' ? 'text-[#c0c1ff] border-b-2 border-[#c0c1ff] pb-1' : 'text-[#c7c4d7] hover:text-[#dfe2f1]'
            }`}
          >
            Active Recall (3D)
          </button>
        </nav>
      </header>

      {/* Main Grid Workspace */}
      <div className="flex-1 flex overflow-hidden z-10">
        <LeftPanel
          uploadedFiles={uploadedFiles}
          setUploadedFiles={setUploadedFiles}
          activeSubject={activeSubject}
          setActiveSubject={setActiveSubject}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
        />

        {/* Center Main Viewport */}
        <section className="flex-1 flex flex-col border-r border-[#464554]/30 overflow-hidden bg-[#0a0e18]/40 backdrop-blur-sm">
          <div className="h-14 border-b border-[#464554]/25 px-6 flex items-center justify-between bg-[#171b26]/50 shrink-0">
            <div className="flex items-center gap-3 text-xs">
              <span className="material-symbols-outlined text-purple-300 text-[20px]">folder</span>
              <span className="text-[#908fa0]">
                {selectedFile ? selectedFile.subject : 'Discrete Math (DMS)'}
              </span>
              <span className="text-[#464554]">/</span>
              <span className="font-medium text-[#dfe2f1]">
                {selectedFile ? selectedFile.name : 'No document selected'}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-[#1c1f2a] text-xs font-mono text-[#908fa0] border border-[#464554]/40">
              {selectedFile ? `Extracted ${overview?.extracted_pages ?? '—'} of ${selectedFile.pageCount} pages` : 'No document'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-5 rounded-xl bg-[#171b26]/80 border border-[#464554]/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#8083ff]/20 text-[#c0c1ff] border border-[#c0c1ff]/30">DOCUMENT OVERVIEW</span>
                    {selectedFile && <span className={`text-[10px] ${overview?.processing_status === 'partial' ? 'text-amber-300' : 'text-emerald-300'}`}>{overview?.processing_status === 'partial' ? 'Partial extraction' : overview ? 'Processed' : 'Processing'}</span>}
                  </div>
                  <h1 className="text-xl font-bold text-[#dfe2f1] tracking-tight">{overview?.title || selectedFile?.name || 'Upload a PDF to view its context'}</h1>
                </div>
                {overviewError && <button onClick={retryOverview} className="text-xs text-[#c0c1ff] underline">Retry</button>}
              </div>
              {overviewLoading && <p className="text-sm text-[#908fa0] mt-4">Building an overview from the extracted document text…</p>}
              {overviewError && <p role="alert" className="text-sm text-rose-300 mt-4">{overviewError}</p>}
              {!selectedFile && <p className="text-sm text-[#908fa0] mt-3">Select or upload a PDF to see its full document summary, key topics, and extracted text.</p>}
              {overview && <>
                <p className="text-sm text-[#dfe2f1] mt-4 leading-relaxed">{overview.summary}</p>
                {overview.key_topics?.length > 0 && <div className="mt-4"><p className="text-[10px] uppercase tracking-wider font-bold text-[#908fa0] mb-2">Key topics</p><div className="flex flex-wrap gap-2">{overview.key_topics.map((topic, index) => <span key={`${topic}-${index}`} className="px-2 py-1 rounded bg-[#262a35] border border-[#464554]/40 text-xs text-[#c7c4d7]">{topic}</span>)}</div></div>}
                {overview.important_concepts?.length > 0 && <div className="mt-4"><p className="text-[10px] uppercase tracking-wider font-bold text-[#908fa0] mb-2">Concepts and formulas detected</p><ul className="list-disc pl-5 space-y-1 text-xs text-[#c7c4d7]">{overview.important_concepts.map((concept, index) => <li key={`${concept}-${index}`}>{concept}</li>)}</ul></div>}
                {overview.ocr_used && <p className="mt-3 text-[11px] text-amber-200">OCR was used to extract this document. Extracted text is available for {overview.extracted_pages} of {overview.page_count} pages.</p>}
                <div className="mt-4 border-t border-[#464554]/30 pt-3">
                  <button onClick={() => setShowExcerpt((open) => !open)} className="text-xs font-semibold text-[#4cd7f6]">{showExcerpt ? 'Hide extracted text excerpt' : 'Show extracted text excerpt'}</button>
                  {showExcerpt && overview.excerpt && <blockquote className="mt-3 p-3 rounded-lg bg-[#0a0e18]/80 border-l-2 border-[#4cd7f6] text-xs text-[#c7c4d7] whitespace-pre-wrap"><span className="block text-[10px] text-[#4cd7f6] mb-2">EXTRACTED OCR TEXT · PAGE {overview.excerpt.page}</span>{overview.excerpt.text}</blockquote>}
                </div>
                <div className="pt-4 flex items-center gap-3">
                  <button onClick={() => handleSendPromptToTutor(`Summarize the key ideas in ${selectedFile.name}`)} className="px-3 py-1 rounded-md bg-[#8083ff]/20 hover:bg-[#8083ff]/40 text-[#c0c1ff] border border-[#c0c1ff]/30 text-xs font-semibold">Ask Tutor</button>
                  <button onClick={() => setActiveTab('recall')} className="px-3 py-1 rounded-md bg-[#1c1f2a] hover:bg-[#262a35] text-[#c7c4d7] border border-[#464554]/30 text-xs font-semibold">Study with flashcards</button>
                </div>
              </>}
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
