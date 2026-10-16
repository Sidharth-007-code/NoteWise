import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { askQuestion, uploadPDF, fetchStudyTools } from '../api';

// Pre-processor to convert unescaped LaTeX patterns into valid KaTeX blocks
const preprocessLaTeX = (content) => {
  if (!content) return '';
  return content
    // Convert [ P(...) ] or [ ... ] equation blocks into $$...$$
    .replace(/\[\s*(P\(.*?\).*?)\s*\]/g, '$$$$ $1$$$$')
    // Fix unescaped fractions like (;P(A)=\frac{13}{52})
    .replace(/(;\s*P\(.*?\)=)frac/g, '$1\\frac')
    .replace(/(;\s*P\(.*?\)=)tfrac/g, '$1\\frac')
    // Ensure set operation symbols have appropriate spacing
    .replace(/\\cap/g, '\\cap ')
    .replace(/\\cup/g, '\\cup ');
};

export default function RightPanel({
  activeTab = 'tutor',
  selectedDocument,
  onRefreshData
}) {
  const [tutorMessages, setTutorMessages] = useState([]);
  const [recallMessages, setRecallMessages] = useState([]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const messagesEndRef = useRef(null);

  const activeMessages = activeTab === 'tutor' ? tutorMessages : recallMessages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeMessages, loading]);

  useEffect(() => {
    if (activeTab === 'recall' && recallMessages.length === 0) {
      triggerActiveRecallQuiz();
    }
  }, [activeTab]);

  const triggerActiveRecallQuiz = async () => {
    setLoading(true);
    const docName = selectedDocument ? selectedDocument.doc_name : 'General Context';
    try {
      const res = await fetchStudyTools('quiz', 'Core concept review', docName, 1);
      const quizText = res.content || `⚡ Active Recall Challenge for ${docName}:\n\nWhat are the main formulas or definitions in your notes?`;
      
      setRecallMessages([
        {
          role: 'assistant',
          text: quizText,
          isRecall: true
        }
      ]);
    } catch (err) {
      console.error('Active recall trigger error:', err);
      setRecallMessages([
        {
          role: 'assistant',
          text: `⚡ Active Recall Mode Active!\n\nSelf-Test Prompt: What are the key definitions or algorithms covered in ${docName}? Type your response from memory below!`,
          isRecall: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim()) return;

    const userText = inputQuery.trim();
    const userMsg = { role: 'user', text: userText };

    if (activeTab === 'tutor') {
      setTutorMessages((prev) => [...prev, userMsg]);
    } else {
      setRecallMessages((prev) => [...prev, userMsg]);
    }

    setInputQuery('');
    setLoading(true);

    try {
      if (activeTab === 'tutor') {
        const res = await askQuestion(userText, selectedDocument?.subject || 'General');
        const aiMsg = {
          role: 'assistant',
          text: res.answer || 'Response generated from indexed PDF notes.',
          sources: res.sources || []
        };
        setTutorMessages((prev) => [...prev, aiMsg]);
      } else {
        const evalPrompt = `[ACTIVE RECALL EVALUATION] User answer: "${userText}". Evaluate accuracy and give concise constructive feedback.`;
        const res = await askQuestion(evalPrompt, selectedDocument?.subject || 'General');
        const evalMsg = {
          role: 'assistant',
          text: res.answer || 'Feedback recorded.',
          sources: res.sources || [],
          isRecall: true
        };
        setRecallMessages((prev) => [...prev, evalMsg]);
      }
    } catch (err) {
      console.error('Chat API Error:', err);
      const errorMsg = {
        role: 'assistant',
        text: '⚠️ Could not connect to the backend server. Make sure `uvicorn main:app --reload` is running on http://127.0.0.1:8000.'
      };
      if (activeTab === 'tutor') {
        setTutorMessages((prev) => [...prev, errorMsg]);
      } else {
        setRecallMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    setShowAttachMenu(false);
    try {
      await uploadPDF(file, selectedDocument?.subject || 'General');
      if (onRefreshData) onRefreshData();
      
      const sysMsg = { role: 'system', text: `📎 Successfully indexed document: ${file.name}` };
      if (activeTab === 'tutor') {
        setTutorMessages((prev) => [...prev, sysMsg]);
      } else {
        setRecallMessages((prev) => [...prev, sysMsg]);
      }
    } catch (err) {
      console.error('Document upload error:', err);
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className="right-panel-wrapper">
      <div className="chat-messages-viewport custom-scrollbar">
        {activeMessages.length === 0 ? (
          <div className="chat-empty-placeholder">
            <div className="placeholder-icon">{activeTab === 'tutor' ? '💬' : '⚡'}</div>
            <h3>{activeTab === 'tutor' ? 'AI Tutor Workspace' : 'Active Recall Mode'}</h3>
            <p>
              {activeTab === 'tutor'
                ? 'Ask questions, request formula breakdowns, or explore definitions from your indexed PDFs.'
                : 'Active Recall Mode: Let NoteWise quiz you on your study notes.'}
            </p>
          </div>
        ) : (
          activeMessages.map((msg, idx) => (
            <div key={idx} className={`chat-bubble-row ${msg.role}`}>
              <div className={`chat-bubble ${msg.isRecall ? 'recall-bubble' : ''}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {preprocessLaTeX(msg.text)}
                </ReactMarkdown>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="source-citations">
                    {msg.sources.map((s, i) => (
                      <span key={i} className="source-tag">
                        📌 {s.doc_name} (Pg {s.page_number})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="chat-bubble-row assistant">
            <div className="chat-bubble loading">
              {activeTab === 'tutor' ? 'NoteWise AI is generating response...' : 'Evaluating your recall answer...'}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="gemini-input-wrapper">
        {showAttachMenu && (
          <div className="attach-popup-menu">
            <label className="attach-option">
              📄 Add / Index Document
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </label>
          </div>
        )}

        <form onSubmit={handleSend} className="gemini-oval-input-bar">
          <button
            type="button"
            className="attach-plus-btn"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            title="Add Document"
          >
            {uploadingDoc ? '⏳' : '+'}
          </button>

          <input
            type="text"
            placeholder={
              activeTab === 'recall'
                ? 'Type your answer from memory to test recall...'
                : selectedDocument
                ? `Ask anything about ${selectedDocument.doc_name}...`
                : 'Ask a question or press + to attach a PDF...'
            }
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
          />

          <button type="submit" className="send-query-btn" disabled={!inputQuery.trim() || loading}>
            ➔
          </button>
        </form>
      </div>
    </div>
  );
}