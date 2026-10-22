import React, { useState, useEffect } from 'react';

export default function CommandPalette({ isOpen, onClose, documents, onSelectDoc, onToggleMode }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredDocs = (documents || []).filter((d) =>
    d.doc_name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="cmd-palette-backdrop" onClick={onClose}>
      <div className="cmd-palette-modal" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <input
            type="text"
            placeholder="Search documents or trigger actions (Ctrl+K)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-white text-sm font-sans px-2"
            autoFocus
          />
          <span className="text-[10px] font-mono text-gray-500 border border-white/10 px-1.5 py-0.5 rounded">ESC</span>
        </div>

        <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
          <div className="text-[10px] font-mono text-gray-500 px-2 py-1 uppercase">Switch Workspace Mode</div>
          <button
            onClick={() => { onToggleMode('tutor'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200 flex items-center justify-between"
          >
            <span>💬 Switch to AI Tutor Mode</span>
            <span className="text-xs font-mono text-[#6366f1]">Mode 1</span>
          </button>
          <button
            onClick={() => { onToggleMode('recall'); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-200 flex items-center justify-between"
          >
            <span>⚡ Launch Active Recall Studio</span>
            <span className="text-xs font-mono text-[#10b981]">Mode 2</span>
          </button>

          <div className="text-[10px] font-mono text-gray-500 px-2 py-1 uppercase mt-2">Indexed Documents</div>
          {filteredDocs.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-500">No matching PDFs found.</div>
          ) : (
            filteredDocs.map((doc, idx) => (
              <button
                key={idx}
                onClick={() => { onSelectDoc(doc); onClose(); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-sm text-gray-300 truncate"
              >
                📄 {doc.doc_name}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}