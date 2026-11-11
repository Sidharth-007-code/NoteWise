import React, { useRef, useState } from 'react';
import { deleteDocument, uploadPDF } from '../api';

export default function LeftPanel({
  uploadedFiles,
  setUploadedFiles,
  selectedFile,
  setSelectedFile
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');

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
          status: result.overview ? 'Processed' : 'Overview pending',
          extractedContent: result.text || '',
          pageCount: result.page_count || result.pages || 0,
          ocrUsed: Boolean(result.ocr_used),
          overview: result.overview || null,
          overviewError: result.overview_error || '',
        };
        setUploadedFiles((previous) => [...previous.filter((entry) => entry.id !== newEntry.id), newEntry]);
        setSelectedFile(newEntry);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const filteredFiles = uploadedFiles;

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
    <aside className="bg-[#171b26] backdrop-blur-xl border-r border-[#464554]/30 shadow-xl w-80 lg:w-[340px] flex flex-col justify-between p-4 shrink-0 h-full overflow-hidden transition-all duration-300">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#464554]/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#8083ff]/20 border border-[#c0c1ff]/30 flex items-center justify-center text-[#c0c1ff]">
              <span className="material-symbols-outlined text-[18px]">auto_stories</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#dfe2f1] leading-tight">Cognitive Library</h2>
              <p className="text-[10px] font-bold text-[#c0c1ff]/80 uppercase tracking-wider">
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
          className="relative cursor-pointer border border-dashed border-[#464554]/60 hover:border-[#c0c1ff] rounded-xl p-4 bg-[#1c1f2a]/40 hover:bg-[#262a35]/40 transition-all duration-200 text-center flex flex-col items-center justify-center gap-1.5 group"
        >
          <div className="w-10 h-10 rounded-full bg-[#c0c1ff]/10 border border-[#c0c1ff]/20 flex items-center justify-center text-[#c0c1ff] group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[20px]">upload_file</span>
          </div>
          <p className="text-[#dfe2f1] text-xs font-semibold">{uploading ? 'Processing PDF…' : 'Drop a PDF or browse'}</p>
          <p className="text-[#908fa0] text-[11px] leading-tight">Extracted and indexed with OCR when needed</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={uploading}
          />
        </div>
        {uploadError && <p role="alert" className="text-[11px] text-rose-300">{uploadError}</p>}

        {deleteError && <p role="alert" className="text-[11px] text-rose-300">{deleteError}</p>}
      </div>

      {/* Indexed File List */}
      <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 my-1 custom-sidebar-scroll">
        {uploadedFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#908fa0]">
            <span className="material-symbols-outlined text-[32px] opacity-40 mb-2">folder_off</span>
            <p className="text-xs">No documents uploaded yet.</p>
            <p className="text-[10px] opacity-70 mt-1">Upload a PDF or note to start querying.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-[11px] font-bold text-[#908fa0] px-1">
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
                      ? 'bg-[#313540] border-l-4 border-l-[#8083ff] border-[#c0c1ff]/60 shadow-[0_0_12px_rgba(128,131,255,0.2)]'
                      : 'bg-[#1c1f2a]/40 border-[#464554]/25 hover:border-[#464554]/60 hover:bg-[#262a35]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`material-symbols-outlined text-[18px] shrink-0 ${isSelected ? 'text-[#8083ff]' : 'text-[#c0c1ff]'}`}>
                        description
                      </span>
                      <span className="font-mono text-xs text-[#dfe2f1] truncate font-medium">
                        {file.name}
                      </span>
                    </div>
                    <button type="button" aria-label={`Remove ${file.name}`} disabled={deleting === file.id} onClick={(event) => { event.stopPropagation(); setPendingDelete(file); }} className="text-rose-300 p-1 disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c0c1ff]">{deleting === file.id ? <span className="material-symbols-outlined animate-spin" aria-hidden="true">progress_activity</span> : <span className="material-symbols-outlined" aria-hidden="true">delete</span>}</button>
                    <span className="text-[10px] font-mono text-[#908fa0] shrink-0">{file.size}</span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {isSelected ? 'Active Context' : file.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>



      {pendingDelete && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center p-4"><div className="max-w-md rounded-xl bg-[#171b26] border border-[#464554] p-5"><p className="text-sm text-[#dfe2f1]">Remove {pendingDelete.name}? This deletes its text, overview, flashcards and quiz from this app. Your original PDF is not affected.</p><div className="flex justify-end gap-2 mt-4"><button onClick={() => setPendingDelete(null)} className="px-3 py-2 text-sm">Cancel</button><button disabled={Boolean(deleting)} onClick={() => confirmDelete(pendingDelete)} className="px-3 py-2 text-sm bg-rose-900 rounded disabled:opacity-50">{deleting ? 'Removing…' : 'Remove'}</button></div></div></div>}
    </aside>
  );
}
