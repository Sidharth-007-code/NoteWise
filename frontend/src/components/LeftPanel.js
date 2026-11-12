import React, { useRef, useState } from 'react';
import { deleteDocument, uploadPDF } from '../api';

export default function LeftPanel({
  uploadedFiles,
  setUploadedFiles,
  selectedFile,
  setSelectedFile,
  documentsLoading = false,
  documentsError = '',
  onRetryDocuments = () => {},
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [search, setSearch] = useState('');

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      for (const file of files) {
        if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF files can be processed.');
        const result = await uploadPDF(file);
        const newEntry = {
          id: result.document_id || result.id,
          name: result.filename || file.name,
          rawBytes: file.size,
          size: file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          status: 'Indexed',
          extractedContent: result.text || '',
          pageCount: result.page_count || result.pages || 0,
          ocrUsed: Boolean(result.ocr_used),
          extractedPages: result.extracted_pages ?? null,
          createdAt: result.created_at ?? null,
          overview: result.overview || null,
          overviewError: result.overview_error || '',
        };
        setUploadedFiles((previous) => [...previous.filter((entry) => entry.id !== newEntry.id), newEntry]);
        setSelectedFile(newEntry);
        onRetryDocuments();
      }
    } catch (error) {
      setUploadError(error.message || 'PDF upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (documentsLoading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const filteredFiles = uploadedFiles.filter((file) => file.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  const confirmDelete = async (file) => {
    setDeleting(file.id);
    setDeleteError('');
    try {
      await deleteDocument(file.id);
      setUploadedFiles((files) => files.filter((entry) => entry.id !== file.id));
      if (selectedFile?.id === file.id) setSelectedFile(null);
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(error.message || 'Could not remove this document.');
    } finally { setDeleting(null); }
  };



  return (
    <aside className="bg-[var(--nw-surface)] border-r border-[var(--nw-border)] w-80 lg:w-[340px] flex flex-col justify-between p-4 shrink-0 h-full overflow-hidden transition-all duration-300">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[var(--nw-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[var(--nw-surface-dim)] border border-[var(--nw-border)] flex items-center justify-center text-[var(--nw-accent)]">
              <span className="material-symbols-outlined text-[18px]">auto_stories</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[var(--nw-text)] leading-tight">Cognitive Library</h2>
              <p className="text-[10px] font-bold text-[var(--nw-text-muted)] uppercase tracking-wider">
                {uploadedFiles.length} {uploadedFiles.length === 1 ? 'SOURCE' : 'SOURCES'} SYNCED
              </p>
            </div>
          </div>
        </div>

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="relative cursor-pointer border border-dashed border-[var(--nw-border)] hover:border-[var(--nw-accent)] rounded-lg p-4 bg-[var(--nw-bg)] hover:bg-[var(--nw-surface-dim)] transition-all duration-200 text-center flex flex-col items-center justify-center gap-1.5 group"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--nw-surface-dim)] border border-[var(--nw-border)] flex items-center justify-center text-[var(--nw-accent)] group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
          </div>
          <p role={uploading ? 'status' : undefined} className="text-[var(--nw-text)] text-xs font-semibold">{uploading ? 'Uploading and indexing…' : 'Drop a PDF or browse'}</p>
          <p className="text-[var(--nw-text-muted)] text-[11px] leading-tight">PDF only · up to 20 MB · OCR when needed</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading || documentsLoading}
          />
        </div>
        {uploadError && <p role="alert" className="text-[11px] text-[var(--nw-danger)]">{uploadError}</p>}

        {deleteError && <p role="alert" className="text-[11px] text-[var(--nw-danger)]">{deleteError}</p>}
      </div>

      {/* Indexed File List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 my-1 custom-sidebar-scroll">
        <label className="block mb-3">
          <span className="sr-only">Search documents by filename</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search filenames"
            aria-label="Search documents by filename"
            className="w-full rounded border border-[var(--nw-border)] bg-[var(--nw-surface)] px-3 py-2 text-sm text-[var(--nw-text)] placeholder:text-[var(--nw-text-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--nw-border-focus)]"
          />
        </label>
        {documentsError && uploadedFiles.length > 0 && <div role="alert" className="mb-2 text-sm text-[var(--nw-danger)]">{documentsError} <button type="button" onClick={onRetryDocuments} className="underline">Retry</button></div>}
        {documentsLoading && uploadedFiles.length === 0 ? (
          <p role="status" className="p-4 text-center text-sm text-[var(--nw-text-muted)]">Loading your library…</p>
        ) : documentsError && uploadedFiles.length === 0 ? (
          <div role="alert" className="p-4 text-center text-sm text-[var(--nw-text-muted)]">
            <p>{documentsError}</p>
            <button type="button" onClick={onRetryDocuments} className="mt-2 underline">Retry</button>
          </div>
        ) : uploadedFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[var(--nw-text-muted)]">
            <span className="material-symbols-outlined text-[32px] opacity-40 mb-2">folder_off</span>
            <p className="text-xs">No documents uploaded yet.</p>
            <p className="text-[10px] opacity-70 mt-1">Upload a PDF to begin studying.</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <p className="p-4 text-center text-sm text-[var(--nw-text-muted)]">No filenames match “{search}”.</p>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] font-bold text-[var(--nw-text-muted)] px-1">
              <span>INDEXED SOURCES ({filteredFiles.length})</span>
            </div>

            {filteredFiles.map((file) => {
              const isSelected = selectedFile?.id === file.id;
              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file)}
                  className={`group p-2.5 rounded-lg border cursor-pointer transition-all flex flex-col gap-2 ${
                    isSelected
                      ? 'bg-[var(--nw-surface-dim)] border-l-4 border-l-[var(--nw-primary)] border-[var(--nw-border)]'
                      : 'bg-[var(--nw-surface)] border-[var(--nw-border)] hover:bg-[var(--nw-bg)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`material-symbols-outlined text-[18px] shrink-0 ${isSelected ? 'text-[var(--nw-accent)]' : 'text-[var(--nw-text-muted)]'}`}>
                        description
                      </span>
                      <span className="font-mono text-xs text-[var(--nw-text)] truncate font-medium">
                        {file.name}
                      </span>
                    </div>
                    <button type="button" aria-label={`Remove ${file.name}`} disabled={deleting === file.id} onClick={(event) => { event.stopPropagation(); setPendingDelete(file); }} className="text-[var(--nw-danger)] p-1 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--nw-border-focus)]">{deleting === file.id ? <span className="material-symbols-outlined animate-spin" aria-hidden="true">progress_activity</span> : <span className="material-symbols-outlined" aria-hidden="true">delete</span>}</button>
                    <span className="text-[10px] font-mono text-[var(--nw-text-muted)] shrink-0">{file.size}</span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[var(--nw-success-border)] bg-[var(--nw-success-bg)] text-[var(--nw-success)] text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--nw-success)]" />
                      {isSelected ? 'Active Context' : file.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[var(--nw-text-muted)]">
                    <span>{file.pageCount ?? 'Unknown'} {file.pageCount === 1 ? 'page' : 'pages'}</span>
                    <span>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'Date unknown'}</span>
                    {file.ocrUsed && <span>OCR applied</span>}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>



      {pendingDelete && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"><div className="max-w-md rounded-xl bg-[var(--nw-surface)] border border-[var(--nw-border)] p-5"><p className="text-sm text-[var(--nw-text)]">Remove {pendingDelete.name}? This deletes its retained PDF, extracted text, overview, flashcards and quiz from this app.</p><div className="flex justify-end gap-2 mt-4"><button onClick={() => setPendingDelete(null)} className="px-3 py-2 text-sm">Cancel</button><button disabled={Boolean(deleting)} onClick={() => confirmDelete(pendingDelete)} className="px-3 py-2 text-sm bg-[var(--nw-danger-bg)] text-[var(--nw-danger)] rounded disabled:opacity-50">{deleting ? 'Removing…' : 'Remove'}</button></div></div></div>}
    </aside>
  );
}
