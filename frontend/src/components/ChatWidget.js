import React, { useState, useEffect, useRef } from 'react';
import { askQuestion, getSubjects } from '../api';

const ChatWidget = ({ subject: currentSubject, onSubjectChange }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [subjects, setSubjects] = useState(['All']);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const subj = await getSubjects();
        setSubjects(subj);
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
  }, [messages]);

  const handleSubjectChange = (e) => {
    onSubjectChange(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question) return;

    // Add user message
    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: question,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    setLoading(true);
    try {
      const response = await askQuestion(question, currentSubject);
      const aiMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.answer,
        sources: response.sources,
        contextFound: response.context_found,
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${err.message}`,
        sources: [],
        contextFound: false,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-widget">
      <div className="chat-controls">
        <label htmlFor="subject-select">Subject: </label>
        <select
          id="subject-select"
          value={currentSubject}
          onChange={handleSubjectChange}
          disabled={loading}
        >
          {subjects.map(subj => (
            <option key={subj} value={subj}>
              {subj}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !inputValue.trim()}
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </div>

      <div className="chat-messages" ref={messagesEndRef}>
        {messages.map(msg => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`message ${isUser ? 'user' : 'assistant'}`}>
              <div className="message-content">
                {msg.content}
              </div>
              {!isUser && msg.sources && msg.sources.length > 0 && (
                <div className="sources">
                  <strong>Sources:</strong>
                  {msg.sources.map((src, idx) => (
                    <span key={idx} className="source-badge">
                      {src.doc_name} p.{src.page_number}
                    </span>
                  ))}
                </div>
              )}
              {!isUser && !msg.contextFound && (
                <div className="no-context">
                  ⚠️ No relevant course material found in the database for this question.
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask a question about your notes..."
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !inputValue.trim()} aria-label="Send">
          {loading ? '...' : '→'}
        </button>
      </form>
    </div>
  );
};

export default ChatWidget;