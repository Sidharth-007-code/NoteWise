import React, { useState, useEffect, useRef } from 'react';
import MarkdownAnswer from './MarkdownAnswer';
import { askDocumentQuestion, getDocumentFlashcards } from '../api';

export default function RightPanel({ activeTab, setActiveTab, initialPrompt, selectedFile, setSelectedFile }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I am your NoteWise AI Copilot. Ask me questions about quantifiers, set relations, proofs, or definitions from your notes.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [knownCards, setKnownCards] = useState({});
  const [missedCards, setMissedCards] = useState({});
  const [reviewMissed, setReviewMissed] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState('');
  const chatEndRef = useRef(null);
  const sessionCards = reviewMissed
    ? flashcards.filter((card) => missedCards[card.id])
    : flashcards;
  const currentCard = sessionCards[cardIndex];
  const knownCount = Object.keys(knownCards).filter((id) => knownCards[id]).length;
  const missedCount = Object.keys(missedCards).filter((id) => missedCards[id]).length;
  const remainingCount = Math.max(0, flashcards.length - knownCount - missedCount);

  useEffect(() => {
    setFlashcards([]);
    setCardIndex(0);
    setRevealed(false);
    setKnownCards({});
    setMissedCards({});
    setReviewMissed(false);
    setCardsError('');
    if (!selectedFile?.id) return undefined;
    let cancelled = false;
    setCardsLoading(true);
    getDocumentFlashcards(selectedFile.id)
      .then((data) => {
        if (!cancelled) setFlashcards((data.cards || []).map((card, index) => ({ ...card, id: `${selectedFile.id}:${index}` })));
      })
      .catch((error) => { if (!cancelled) setCardsError(error.message); })
      .finally(() => { if (!cancelled) setCardsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedFile?.id]);

  useEffect(() => {
    setCardIndex(0);
    setRevealed(false);
  }, [reviewMissed]);

  useEffect(() => {
    if (cardIndex >= sessionCards.length) setCardIndex(Math.max(0, sessionCards.length - 1));
  }, [cardIndex, sessionCards.length]);

  const moveCard = (offset) => {
    if (!sessionCards.length) return;
    setCardIndex((index) => (index + offset + sessionCards.length) % sessionCards.length);
    setRevealed(false);
  };

  const rateCard = (known) => {
    if (!currentCard) return;
    if (known) {
      setKnownCards((state) => ({ ...state, [currentCard.id]: true }));
      setMissedCards((state) => { const next = { ...state }; delete next[currentCard.id]; return next; });
    } else {
      setMissedCards((state) => ({ ...state, [currentCard.id]: true }));
      setKnownCards((state) => { const next = { ...state }; delete next[currentCard.id]; return next; });
    }
    moveCard(1);
  };

  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const query = inputText.trim();
    const contextName = selectedFile ? selectedFile.name : null;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      context: contextName || 'All Knowledge Base',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      // Calls your actual FastAPI Backend
      const data = await askDocumentQuestion(query, selectedFile?.id);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: data.answer,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `Error connecting to AI Backend: ${error.message} Ensure FastAPI is running on port 8000.`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <section className="w-full xl:w-[480px] 2xl:w-[540px] flex flex-col bg-[#171b26]/95 border-l border-[#464554]/30 backdrop-blur-2xl h-full shrink-0 relative overflow-hidden">
      <div className="h-14 border-b border-[#464554]/30 px-4 flex items-center justify-between bg-[#0a0e18]/80 shrink-0">
        <div className="flex items-center p-1 rounded-xl bg-[#262a35]/60 border border-[#464554]/30 w-full max-w-sm">
          <button
            onClick={() => setActiveTab('tutor')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'tutor' ? 'bg-[#8083ff] text-[#0d0096] shadow-sm' : 'text-[#c7c4d7] hover:text-[#dfe2f1]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">psychology</span> AI Tutor Studio
          </button>
          <button
            onClick={() => setActiveTab('recall')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'recall' ? 'bg-[#8083ff] text-[#0d0096] shadow-sm' : 'text-[#c7c4d7] hover:text-[#dfe2f1]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">view_carousel</span> Active Recall (3D)
          </button>
        </div>
      </div>

      {activeTab === 'tutor' ? (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="bg-[#1c1f2a]/90 px-4 py-2 border-b border-[#464554]/30 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 text-[#c0c1ff]">
              <span className="material-symbols-outlined text-[16px]">find_in_page</span>
              <span className="font-semibold text-[11px] truncate max-w-[280px]">
                Target PDF: {selectedFile ? selectedFile.name : 'All Knowledge Base Repositories'}
              </span>
            </div>
            {selectedFile && (
              <button
                onClick={() => setSelectedFile(null)}
                className="text-[10px] text-[#908fa0] hover:text-[#dfe2f1] underline shrink-0"
              >
                Clear Scope
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end pl-8' : 'pr-4'}`}>
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-[#8083ff] text-[#0d0096] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  </div>
                )}
                <div className={`p-3.5 rounded-2xl text-xs text-[#dfe2f1] max-w-[88%] leading-relaxed whitespace-pre-line ${msg.sender === 'user' ? 'bg-[#8083ff]/20 border border-[#c0c1ff]/30 rounded-tr-sm' : 'bg-[#262a35]/80 border border-[#464554]/35 rounded-tl-sm'}`}>
                  {msg.context && msg.sender === 'user' && (
                    <div className="text-[10px] text-[#4cd7f6] font-mono mb-1 pb-1 border-b border-[#464554]/30">
                      📄 Scanned Scope: {msg.context}
                    </div>
                  )}
                  {msg.sender === 'ai' ? <MarkdownAnswer>{msg.text}</MarkdownAnswer> : msg.text}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-[#262a35]/60 border border-[#464554]/30 w-fit text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse delay-100" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse delay-200" />
                <span className="font-mono text-[11px] ml-1 text-[#c0c1ff]/80">Synthesizing from Vector Store...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-[#464554]/30 bg-[#0a0e18]/90 shrink-0">
            <div className="relative rounded-xl bg-[#262a35]/70 border border-[#464554]/40 focus-within:border-[#c0c1ff] transition-all overflow-hidden p-2 flex items-center gap-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="w-full bg-transparent p-1 text-xs text-[#dfe2f1] focus:outline-none resize-none placeholder:text-[#908fa0]/70"
                placeholder={selectedFile ? `Ask NoteWise questions about ${selectedFile.name}...` : 'Ask NoteWise to reason over notes, synthesize theorems, or solve proofs...'}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="p-2.5 rounded-lg bg-[#8083ff] text-[#0d0096] hover:bg-[#c0c1ff] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-5 items-center gap-4 overflow-y-auto">
          <div className="w-full flex justify-between items-center text-xs text-[#908fa0]">
            <span className="font-semibold text-[#c0c1ff]">{selectedFile ? `From ${selectedFile.name}` : 'Select a processed PDF'}</span>
            <span className="font-mono">{sessionCards.length ? `Card ${cardIndex + 1} of ${sessionCards.length}` : 'No cards'}</span>
          </div>
          <div className="w-full flex gap-3 justify-center text-[10px] text-[#908fa0]">
            <span>Known {knownCount}</span><span>Missed {missedCount}</span><span>Remaining {remainingCount}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-[#262a35] overflow-hidden"><div className="h-full bg-emerald-400 transition-all" style={{ width: `${flashcards.length ? ((knownCount + missedCount) / flashcards.length) * 100 : 0}%` }} /></div>
          {cardsLoading ? <p className="text-sm text-[#908fa0] m-auto">Generating cards from this PDF…</p> : null}
          {cardsError ? <div className="m-auto text-center text-sm text-rose-300"><p>{cardsError}</p><button onClick={() => { setCardsError(''); setCardsLoading(true); getDocumentFlashcards(selectedFile?.id).then((data) => setFlashcards((data.cards || []).map((card, index) => ({ ...card, id: `${selectedFile.id}:${index}` })))).catch((error) => setCardsError(error.message)).finally(() => setCardsLoading(false)); }} className="mt-3 underline">Retry</button></div> : null}
          {!cardsLoading && !cardsError && !selectedFile && <p className="m-auto text-center text-sm text-[#908fa0]">Upload and select a processed PDF to build a grounded recall deck.</p>}
          {!cardsLoading && !cardsError && selectedFile && !flashcards.length && <p className="m-auto text-center text-sm text-[#908fa0]">No study cards were generated for this document.</p>}
          {currentCard && <article className="w-full max-w-md min-h-[250px] rounded-2xl bg-[#262a35]/90 border border-[#464554]/40 p-6 flex flex-col gap-5 shadow-xl">
            <span className="text-[10px] font-bold text-[#c0c1ff] tracking-wider uppercase">{revealed ? 'Answer' : 'Question'}</span>
            <div className="text-sm text-[#dfe2f1] leading-relaxed"><MarkdownAnswer>{revealed ? currentCard.answer : currentCard.question}</MarkdownAnswer></div>
            {!revealed && <button onClick={() => setRevealed(true)} className="mt-auto px-4 py-2 rounded-lg bg-[#8083ff] text-[#0d0096] text-xs font-bold">Reveal Answer</button>}
            {revealed && <div className="mt-auto flex gap-3"><button onClick={() => rateCard(false)} className="flex-1 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-400/40 text-rose-300 text-xs font-bold">Review Again</button><button onClick={() => rateCard(true)} className="flex-1 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 text-xs font-bold">Know It</button></div>}
          </article>}
          {flashcards.length > 0 && <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => moveCard(-1)} className="px-3 py-2 rounded-lg bg-[#262a35] border border-[#464554]/40 text-xs font-bold text-[#dfe2f1]">Previous</button>
            <button onClick={() => { setReviewMissed((value) => !value); }} className="px-3 py-2 rounded-lg bg-[#262a35] border border-[#464554]/40 text-xs font-bold text-[#dfe2f1]" disabled={!missedCount}>{reviewMissed ? 'All Cards' : 'Review Missed'}</button>
            <button onClick={() => { setKnownCards({}); setMissedCards({}); setReviewMissed(false); setCardIndex(0); setRevealed(false); }} className="px-3 py-2 rounded-lg bg-[#262a35] border border-[#464554]/40 text-xs font-bold text-[#dfe2f1]">Restart</button>
            <button onClick={() => moveCard(1)} className="px-3 py-2 rounded-lg bg-[#262a35] border border-[#464554]/40 text-xs font-bold text-[#dfe2f1]">Next</button>
          </div>}
        </div>
      )}
    </section>
  );
}
