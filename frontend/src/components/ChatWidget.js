import React, { useState, useEffect, useRef } from 'react';
import MarkdownAnswer from './MarkdownAnswer';
import { askQuestion, getSubjects } from '../api';

const ChatWidget = ({ subject: currentSubject, onSubjectChange }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [subjects, setSubjects] = useState(['All']);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subj = await getSubjects();
        setSubjects(['All', ...subj.filter(s => s !== 'All')]);
      } catch (err) {
        console.error('Failed to load subjects:', err);
        setSubjects(['All']);
      }
    };
    fetchSubjects();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const question = inputValue.trim();
    if (!question || loading) return;

    const userMsg = { id: Date.now(), role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const response = await askQuestion(question, currentSubject);
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        sources: response.sources || [],
        contextFound: response.context_found,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `**Error:** ${err.message}`,
        sources: [],
        contextFound: false,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#94a3b8' }}>
        <label htmlFor="subject-select" style={{ fontWeight: '700', color: '#cbd5e1' }}>Subject Context:</label>
        <select
          id="subject-select"
          value={currentSubject}
          onChange={(e) => onSubjectChange(e.target.value)}
          disabled={loading}
          style={{
            flex: 1,
            height: '38px',
            borderRadius: '6px',
            border: '1px solid #26334d',
            backgroundColor: '#131b2e',
            color: '#f8fafc',
            fontSize: '0.88rem'
          }}
        >
          {subjects.map((subj) => (
            <option key={subj} value={subj}>
              {subj}
            </option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b', fontSize: '0.9rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🤖</div>
            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.05rem', marginBottom: '6px' }}>Ask NoteWise AI</div>
            <div style={{ lineHeight: '1.5' }}>Query definitions, formulas, or conceptual explanations directly from your indexed PDFs.</div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                backgroundColor: isUser ? '#6366f1' : '#131b2e',
                color: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '10px',
                border: isUser ? 'none' : '1px solid #26334d',
                maxWidth: '92%',
                fontSize: '0.92rem',
                lineHeight: '1.5',
                boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
              }}
            >
              <div style={{ wordBreak: 'break-word' }}>
                {isUser ? (
                  msg.content
                ) : (
                  <MarkdownAnswer>{msg.content}</MarkdownAnswer>
                )}
              </div>

              {!isUser && msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #26334d', fontSize: '0.8rem' }}>
                  <strong style={{ color: '#94a3b8' }}>Sources:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                    {msg.sources.map((src, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          border: '1px solid rgba(56, 189, 248, 0.25)',
                          fontWeight: 600
                        }}
                      >
                        📄 {src.doc_name} (p.{src.page_number})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!isUser && !msg.contextFound && (
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#f43f5e' }}>
                  ⚠️ No relevant course material found for this query.
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            backgroundColor: '#131b2e',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid #26334d',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '0.88rem', color: '#818cf8', fontWeight: 600 }}>NoteWise thinking</span>
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question about your notes..."
          onKeyDown={handleKeyDown}
          disabled={loading}
          style={{
            flex: 1,
            height: '44px',
            borderRadius: '8px',
            border: '1px solid #26334d',
            backgroundColor: '#131b2e',
            color: '#f8fafc',
            fontSize: '0.9rem'
          }}
        />
        <button
          type="submit"
          disabled={loading || !inputValue.trim()}
          style={{
            height: '44px',
            padding: '0 18px',
            backgroundColor: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: 700
          }}
        >
          {loading ? '...' : 'Ask'}
        </button>
      </form>
    </div>
  );
};

export default ChatWidget;
