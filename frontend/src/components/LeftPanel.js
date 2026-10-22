import React, { useRef, useState } from 'react';
import { uploadPDF } from '../api';

export default function LeftPanel({
  uploadedFiles,
  setUploadedFiles,
  activeSubject,
  setActiveSubject,
  selectedFile,
  setSelectedFile
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setUploadError('');
    try {
      for (const file of files) {
        if (!file.name.toLowerCase().endsWith('.pdf')) throw new Error('Only PDF files can be processed.');
        const filename = file.name.toLowerCase();
        const subject = filename.includes('dms') ? 'DMS' : filename.includes('prob') ? 'Prob Theory' : filename.includes('os') ? 'OS' : 'General';
        const result = await uploadPDF(file, subject);
        const newEntry = {
          id: result.document_id || result.id,
          name: result.filename || file.name,
          rawBytes: file.size,
          size: file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          subject: result.subject || 'General',
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

  const filteredFiles =
    activeSubject === 'All'
      ? uploadedFiles
      : uploadedFiles.filter((f) => f.subject === activeSubject);

  const totalMaxGB = 10;
  const totalBytes = uploadedFiles.reduce((acc, f) => acc + (f.rawBytes || 0), 0);
  const totalMB = totalBytes / (1024 * 1024);
  const totalGB = totalBytes / (1024 * 1024 * 1024);

  const formattedUsage =
    totalGB >= 0.1 ? `${totalGB.toFixed(2)} GB` : `${totalMB.toFixed(1)} MB`;

  const storagePercentage = Math.min((totalGB / totalMaxGB) * 100, 100);

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

        {/* Subject Filter Tag Pills */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['All', 'DMS', 'Prob Theory', 'OS', 'General'].map((subj) => (
              <button
                key={subj}
                onClick={() => setActiveSubject(subj)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors flex items-center gap-1 ${
                  activeSubject === subj
                    ? 'bg-[#8083ff] text-[#0d0096] border border-[#c0c1ff]'
                    : 'bg-[#1c1f2a] text-[#c7c4d7] border border-[#464554]/30 hover:bg-[#262a35]'
                }`}
              >
                {subj}
              </button>
            ))}
          </div>
        )}
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
                    <span className="text-[10px] font-mono text-[#908fa0] shrink-0">{file.size}</span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#1c1f2a] text-[#c0c1ff] border border-[#464554]/30">
                      {file.subject}
                    </span>
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

      {/* ChromaDB Storage Meter */}
      <div className="pt-3 border-t border-[#464554]/30 flex flex-col gap-2.5">
        <div className="bg-[#1c1f2a]/60 p-2.5 rounded-lg border border-[#464554]/20">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#908fa0] font-semibold">ChromaDB Storage</span>
            <span className="font-mono text-[11px] text-[#c0c1ff]">
              {formattedUsage} / {totalMaxGB} GB
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#313540] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c0c1ff] via-[#8083ff] to-[#4cd7f6] rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(128,131,255,0.6)]"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
