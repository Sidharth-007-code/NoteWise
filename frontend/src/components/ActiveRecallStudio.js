import React, { useState, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { X, RotateCcw, Brain, Check, Bolt, BookOpen, Lightbulb } from 'lucide-react';

export default function ActiveRecallStudio({ selectedDocument, onClose }) {
  const [revealed, setRevealed] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(1);
  const totalCards = 5;

  const docName = selectedDocument ? selectedDocument.doc_name : 'Neural Dynamics in Hippocampal Networks (pp. 14–22)';

  const handleRate = useCallback((effort) => {
    setRevealed(false);
    if (currentCardIndex < totalCards) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      if (onClose) onClose();
    }
  }, [currentCardIndex, totalCards, onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setRevealed((prev) => !prev);
      } else if (e.key === '1') {
        handleRate('hard');
      } else if (e.key === '2') {
        handleRate('good');
      } else if (e.key === '3') {
        handleRate('easy');
      } else if (e.key === 'Escape') {
        if (onClose) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRate, onClose]);

  const latexFormula = '$$\\Delta \\theta = 2\\pi \\cdot (f_{\\text{cell}} - f_{\\text{LFP}}) \\cdot t$$';

  return (
    <div className="active-recall-overlay">
      <main className="active-recall-card">
        {/* Header */}
        <header style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyBetween: 'space-between', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(255, 255, 255, 0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <BookOpen size={18} color="#8083ff" />
            <span style={{ fontSize: '14px', fontFamily: 'var(--font-mono)', color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{docName}</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', cursor: 'pointer', marginLeft: 'auto' }}
          >
            <X size={18} />
          </button>
        </header>

        {/* Progress Bar */}
        <section style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', fontFamily: 'var(--font-mono)', color: '#8083ff' }}>
            <span>Card {currentCardIndex} of {totalCards}</span>
            <span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 10px', borderRadius: '9999px' }}>
              84% Retention
            </span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#1f293d', borderRadius: '9999px', overflow: 'hidden' }}>
            <div
              style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)', width: `${(currentCardIndex / totalCards) * 100}%`, transition: 'all 0.3s ease' }}
            />
          </div>
        </section>

        {/* Card Body */}
        <div className="custom-scrollbar" style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '60vh', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <article style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
              <span style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', textTransform: 'uppercase' }}>
                Active Recall • Synaptic Plasticity
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Brain size={14} color="#8083ff" /> CA1 Subfield
              </span>
            </div>
            <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#ffffff', lineHeight: '1.5', margin: 0 }}>
              Explain how theta phase precession coordinates the spike timing of CA1 place cells relative to the local field potential (LFP).
            </h2>
            <div style={{ marginTop: '1rem', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#8083ff' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Lightbulb size={16} /> Core concept: Phase code vs. rate code
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{revealed ? 'Revealed' : 'Hidden'}</span>
            </div>
            {!revealed && (
              <button
                onClick={() => setRevealed(true)}
                style={{ marginTop: '1.25rem', width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', color: '#8083ff', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Reveal Model Answer (Press Space)
              </button>
            )}
          </article>

          {/* Model Answer (Revealed State) */}
          {revealed && (
            <article style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ color: '#8083ff', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={18} color="#10b981" /> Model Answer &amp; Proof
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8', padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)' }}>
                  Hippocampal Oscillations
                </span>
              </div>

              <div style={{ padding: '12px', borderRadius: '10px', background: '#090d14', border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#10b981' }}>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '6px' }}>Phase Offset Equation:</div>
                <div style={{ color: '#8083ff' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {latexFormula}
                  </ReactMarkdown>
                </div>
              </div>

              <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '14px', color: '#e2e8f0', lineHeight: '1.6' }}>
                <li style={{ marginBottom: '6px' }}>
                  <strong>Frequency Offset:</strong> Intrinsic burst frequency of CA1 pyramidal neurons slightly exceeds extracellular theta frequency (4–8 Hz).
                </li>
                <li>
                  <strong>Temporal Compression:</strong> Multi-second trajectories are compressed into single ~120 ms theta cycles enabling STDP and LTP.
                </li>
              </ul>
            </article>
          )}
        </div>

        {/* Self-Grading Footer */}
        {revealed && (
          <footer style={{ padding: '1.25rem 1.5rem', background: '#090d14', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#94a3b8', textTransform: 'uppercase' }}>
              <span>Rate recall effort:</span>
              <span>Anki FSRS Algorithm</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <button
                onClick={() => handleRate('hard')}
                style={{ padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><RotateCcw size={16} /> Hard</div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>+1d</div>
              </button>
              <button
                onClick={() => handleRate('good')}
                style={{ padding: '12px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Check size={16} /> Good</div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>+3d</div>
              </button>
              <button
                onClick={() => handleRate('easy')}
                style={{ padding: '12px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', cursor: 'pointer', textAlign: 'center' }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Bolt size={16} /> Easy</div>
                <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>+7d</div>
              </button>
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}