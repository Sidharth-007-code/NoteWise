
import React, { useState, useEffect, useRef } from 'react';
import MarkdownAnswer from './MarkdownAnswer';
import InteractiveQuiz from './InteractiveQuiz';
import { askDocumentQuestion, getDocumentFlashcards } from '../api';
import { Maximize2, Minimize2 } from 'lucide-react';
import './RightPanelTypography.css';

export default function RightPanel({
  activeTab,
  setActiveTab,
  initialPrompt,
  selectedFile,
  setSelectedFile,
}) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Hello! I am your NoteWise AI Copilot. Ask me questions about quantifiers, set relations, proofs, definitions, or mathematical expressions from your notes.',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [flashcards, setFlashcards] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [knownCards, setKnownCards] = useState({});
  const [reviewQueue, setReviewQueue] = useState([]);
  const [sessionMode, setSessionMode] = useState('all');
  const [reviewSessionCards, setReviewSessionCards] = useState([]);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsError, setCardsError] = useState('');
  const [maximized, setMaximized] = useState(false);

  const chatEndRef = useRef(null);
  const completionGuardRef = useRef(false);
  const previousDocumentId = useRef(selectedFile?.id || null);

  useEffect(() => {
    if (!maximized) return undefined;
    const handleKeyDown = (event) => { if (event.key === 'Escape') setMaximized(false); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximized]);

  const sessionCards = sessionMode === 'review' ? reviewSessionCards : flashcards;

  const currentCard = sessionCards[cardIndex];

  const knownCount = Object.values(knownCards).filter(Boolean).length;
  const missedCount = reviewQueue.length;

  const remainingCount = Math.max(
    0,
    flashcards.length - knownCount - missedCount
  );

  // Load flashcards whenever the selected document changes.
  useEffect(() => {
    let cancelled = false;

    setFlashcards([]);
    setCardIndex(0);
    setRevealed(false);
    setKnownCards({});
    setReviewQueue([]);
    setSessionMode('all');
    setReviewSessionCards([]);
    setSessionComplete(false);
    completionGuardRef.current = false;
    setCardsError('');

    if (!selectedFile?.id) {
      setCardsLoading(false);
      return undefined;
    }

    setCardsLoading(true);

    getDocumentFlashcards(selectedFile.id)
      .then((data) => {
        if (cancelled) return;

        const cards = (data.cards || []).map((card, index) => ({
          ...card,
          id: `${selectedFile.id}:${index}`,
        }));

        setFlashcards(cards);
      })
      .catch((error) => {
        if (!cancelled) {
          setCardsError(
            error?.message || 'Unable to load flashcards. Please try again.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCardsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFile?.id]);

  // Keep the index valid when a deck is replaced or the review queue changes.
  useEffect(() => {
    if (cardIndex >= sessionCards.length) {
      setCardIndex(Math.max(0, sessionCards.length - 1));
    }
  }, [cardIndex, sessionCards.length]);

  // Populate the tutor input when a suggested prompt is selected.
  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    if (previousDocumentId.current !== (selectedFile?.id || null)) {
      previousDocumentId.current = selectedFile?.id || null;
      setMessages([{ id: Date.now(), sender: 'ai', text: 'Hello! I am your NoteWise AI Copilot. Ask me questions about your notes.' }]);
      setInputText('');
    }
  }, [selectedFile?.id]);

  // Scroll to the newest chat message.
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const moveCard = (offset) => {
    if (!sessionCards.length || sessionComplete) return;
    setCardIndex((index) => Math.min(sessionCards.length - 1, Math.max(0, index + offset)));

    setRevealed(false);
  };

  const rateCard = (known) => {
    if (!currentCard || sessionComplete || completionGuardRef.current) return;

    if (known) {
      setKnownCards((state) => ({
        ...state,
        [currentCard.id]: true,
      }));
      setReviewQueue((queue) => queue.filter((card) => card.id !== currentCard.id));
    } else {
      setKnownCards((state) => {
        const next = { ...state };
        delete next[currentCard.id];
        return next;
      });
      setReviewQueue((queue) => {
        const next = queue.some((card) => card.id === currentCard.id)
          ? queue
          : [...queue, currentCard];
        return [...next].sort((left, right) =>
          flashcards.findIndex((card) => card.id === left.id) -
          flashcards.findIndex((card) => card.id === right.id)
        );
      });
    }

    setRevealed(false);
    if (cardIndex >= sessionCards.length - 1) {
      completionGuardRef.current = true;
      setSessionComplete(true);
    } else {
      setCardIndex((index) => Math.min(sessionCards.length - 1, index + 1));
    }
  };

  const startReviewSession = () => {
    if (!reviewQueue.length) return;
    setReviewSessionCards([...reviewQueue]);
    setSessionMode('review');
    setCardIndex(0);
    setRevealed(false);
    setSessionComplete(false);
    completionGuardRef.current = false;
  };

  const finishSession = () => {
    setSessionComplete(false);
    setSessionMode('all');
    setReviewSessionCards([]);
    setCardIndex(0);
    setRevealed(false);
    setActiveTab('tutor');
  };

  const handleSendMessage = async () => {
    const query = inputText.trim();

    if (!query || isTyping) return;

    const contextName = selectedFile?.name || 'All Knowledge Base';

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: query,
      context: contextName,
    };

    setMessages((previous) => [...previous, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const data = await askDocumentQuestion(query, selectedFile?.id);

      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text:
            typeof data?.answer === 'string'
              ? data.answer
              : 'The AI returned an empty answer. Please try asking again.',
        },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `Error connecting to the AI backend: ${
            error?.message || 'Unknown error'
          }\n\nPlease check that FastAPI is running on port 8000.`,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const retryFlashcards = () => {
    if (!selectedFile?.id) return;

    setCardsError('');
    setCardsLoading(true);

    getDocumentFlashcards(selectedFile.id)
      .then((data) => {
        setFlashcards(
          (data.cards || []).map((card, index) => ({
            ...card,
            id: `${selectedFile.id}:${index}`,
          }))
        );

        setCardIndex(0);
        setRevealed(false);
      })
      .catch((error) => {
        setCardsError(
          error?.message || 'Unable to load flashcards. Please try again.'
        );
      })
      .finally(() => setCardsLoading(false));
  };

  const restartDeck = () => {
    setKnownCards({});
    setReviewQueue([]);
    setSessionMode('all');
    setReviewSessionCards([]);
    setSessionComplete(false);
    completionGuardRef.current = false;
    setCardIndex(0);
    setRevealed(false);
  };

  return (
    <section data-maximized={maximized} className={`${maximized ? 'nw-maximized fixed inset-0 z-[60]' : 'nw-panel-root w-full xl:w-[480px] 2xl:w-[540px] relative'} flex flex-col bg-[#171b26]/95 border-l border-[#464554]/30 backdrop-blur-2xl h-full shrink-0 overflow-hidden transition-[width] duration-150 motion-reduce:transition-none`}>
      {/* Panel tabs */}
      <div className="nw-panel-header h-14 border-b border-[#464554]/30 flex items-center bg-[#0a0e18]/80 shrink-0">
        <div className="nw-content-column nw-panel-header-inner flex items-center justify-between">
        <div className="inline-flex items-center p-1 rounded-xl bg-[#262a35]/60 border border-[#464554]/30 min-w-0 max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab('tutor')}
            aria-label="AI Tutor Studio"
            className={`nw-tab py-1.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'tutor'
                ? 'bg-[#8083ff] text-[#0d0096] shadow-sm'
                : 'text-[#c7c4d7] hover:text-[#dfe2f1]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              psychology
            </span>
            <span className="nw-tab-label">AI Tutor Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('recall')}
            aria-label="Active Recall (3D)"
            className={`nw-tab py-1.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'recall'
                ? 'bg-[#8083ff] text-[#0d0096] shadow-sm'
                : 'text-[#c7c4d7] hover:text-[#dfe2f1]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              view_carousel
            </span>
            <span className="nw-tab-label">Active Recall (3D)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('quiz')}
            aria-label="Concept Quiz"
            className={`nw-tab py-1.5 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'quiz'
                ? 'bg-[#8083ff] text-[#0d0096] shadow-sm'
                : 'text-[#c7c4d7] hover:text-[#dfe2f1]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">task_alt</span>
            <span className="nw-tab-label">Concept Quiz</span>
          </button>
        </div>
        <button type="button" aria-label={maximized ? 'Restore panel' : 'Maximize panel'} title={maximized ? 'Restore panel' : 'Maximize panel'} onClick={() => setMaximized((value) => !value)} className="ml-2 shrink-0 p-2 rounded-lg text-[#c7c4d7] hover:text-white hover:bg-[#313540] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#c0c1ff]">
          {maximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
        </div>
      </div>

      {/* AI Tutor */}
      <div className={`nw-content-column nw-panel-content ${activeTab === 'tutor' ? 'nw-tutor-layout' : ''}`}>
      <div className="nw-tab-pane" hidden={activeTab !== 'quiz'}>
        <InteractiveQuiz selectedFile={selectedFile} />
      </div>
      <div className="nw-tab-pane" hidden={activeTab !== 'tutor'}>
        <div className="nw-tutor flex-1 flex flex-col overflow-hidden relative min-w-0">
          <div className="nw-scope-row bg-[#1c1f2a]/90 py-2 border-b border-[#464554]/30 flex items-center justify-between shrink-0 min-w-0">
            <div className="flex items-center gap-2 text-[#c0c1ff] min-w-0">
              <span className="material-symbols-outlined text-[16px]">
                find_in_page
              </span>

              <span className="font-semibold truncate max-w-[280px]">
                Target PDF:{' '}
                {selectedFile
                  ? selectedFile.name
                  : 'All Knowledge Base Repositories'}
              </span>
            </div>

            {selectedFile && (
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-[#908fa0] hover:text-[#dfe2f1] underline shrink-0"
              >
                Clear Scope
              </button>
            )}
          </div>

          <div className="nw-message-area flex-1 overflow-y-auto p-4 space-y-4 min-w-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 ${
                    msg.sender === 'user' ? 'justify-end pl-8' : 'pr-4'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-[#8083ff] text-[#0d0096] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[16px]">
                      auto_awesome
                    </span>
                  </div>
                )}

                <div
                  className={`nw-message min-w-0 p-3.5 rounded-2xl text-[#dfe2f1] max-w-[100%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#8083ff]/20 border border-[#c0c1ff]/30 rounded-tr-sm whitespace-pre-wrap'
                      : 'bg-[#262a35]/80 border border-[#464554]/35 rounded-tl-sm'
                  }`}
                >
                  {msg.context && msg.sender === 'user' && (
                    <div className="nw-scope-label text-[#4cd7f6] font-mono mb-1 pb-1 border-b border-[#464554]/30 break-words">
                      📄 Scanned Scope: {msg.context}
                    </div>
                  )}

                  {msg.sender === 'ai' ? (
                    <MarkdownAnswer>{msg.text}</MarkdownAnswer>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-[#262a35]/60 border border-[#464554]/30 w-fit text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse delay-100" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse delay-200" />
                <span className="font-mono text-[11px] ml-1 text-[#c0c1ff]/80">
                  Synthesizing from Vector Store...
                </span>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Tutor input */}
          <div className="nw-input-row border-t border-[#464554]/30 bg-[#0a0e18]/90 shrink-0">
            <div className="relative rounded-xl bg-[#262a35]/70 border border-[#464554]/40 focus-within:border-[#c0c1ff] transition-all overflow-hidden p-2 flex items-center gap-2">
              <textarea
                value={inputText}
                onChange={(event) => setInputText(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                className="w-full min-w-0 bg-transparent p-1 text-[#dfe2f1] focus:outline-none resize-none placeholder:text-[#908fa0]/70"
                placeholder={
                  selectedFile
                    ? `Ask NoteWise questions about ${selectedFile.name}...`
                    : 'Ask NoteWise to explain equations, theorems, or proofs...'
                }
              />

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="p-2.5 rounded-lg bg-[#8083ff] text-[#0d0096] hover:bg-[#c0c1ff] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                aria-label="Send message"
              >
                <span className="material-symbols-outlined text-[18px]">
                  send
                </span>
              </button>
            </div>

            <p className="nw-helper text-[#908fa0] mt-1.5 px-1">
              Enter to send · Shift + Enter for a new line
            </p>
          </div>
        </div>
      </div>
      <div className="nw-tab-pane" hidden={activeTab !== 'recall'}>
        {/* Active Recall */}
        <div className="nw-recall flex-1 flex flex-col p-5 items-center gap-4 overflow-y-auto min-w-0">
          {!sessionComplete && <div className="w-full flex justify-between items-center gap-3 text-xs text-[#908fa0]">
            <span className="font-semibold text-[#c0c1ff] truncate">
              {selectedFile
                ? `From ${selectedFile.name}`
                : 'Select a processed PDF'}
            </span>

            <span className="font-mono shrink-0">
              {sessionCards.length
                ? `Card ${cardIndex + 1} of ${sessionCards.length}`
                : 'No cards'}
            </span>
          </div>}

          {!sessionComplete && <div className="w-full flex gap-3 justify-center text-[10px] text-[#908fa0]">
            <span>Known {knownCount}</span>
            <span>Review Again {missedCount}</span>
            <span>Remaining {remainingCount}</span>
          </div>}

          {!sessionComplete && <div className="w-full h-1.5 rounded-full bg-[#262a35] overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all"
              style={{
                width: `${
                  flashcards.length
                    ? ((knownCount + missedCount) / flashcards.length) * 100
                    : 0
                }%`,
              }}
            />
          </div>}

          {cardsLoading && (
            <p className="text-sm text-[#908fa0] m-auto">
              Loading cards from this PDF…
            </p>
          )}

          {cardsError && (
            <div className="m-auto text-center text-sm text-rose-300">
              <p>{cardsError}</p>

              <button
                type="button"
                onClick={retryFlashcards}
                className="mt-3 underline"
              >
                Retry
              </button>
            </div>
          )}

          {sessionComplete && !cardsLoading && !cardsError && (
            <div className="w-full max-w-md m-auto rounded-2xl bg-[#262a35]/90 border border-[#8083ff]/40 p-6 text-center shadow-xl">
              <div className="text-2xl mb-2" aria-hidden="true">🎉</div>
              <h2 className="text-lg font-bold text-[#dfe2f1]">
                {sessionMode === 'review' ? 'Review session complete!' : 'Session complete!'}
              </h2>
              <p className="mt-2 text-xs text-[#908fa0]">This session has ended.</p>
              <div className="grid grid-cols-3 gap-2 mt-5 text-xs">
                <div className="rounded-lg bg-[#171b26] p-3"><strong className="block text-[#c0c1ff] text-lg">{sessionMode === 'review' ? reviewSessionCards.length : flashcards.length}</strong>Completed</div>
                <div className="rounded-lg bg-[#171b26] p-3"><strong className="block text-emerald-300 text-lg">{knownCount}</strong>Known</div>
                <div className="rounded-lg bg-[#171b26] p-3"><strong className="block text-rose-300 text-lg">{missedCount}</strong>Review Again</div>
              </div>
              {missedCount === 0 ? (
                <p className="mt-4 text-sm text-emerald-300">Excellent! You have no flashcards pending review.</p>
              ) : (
                <p className="mt-4 text-sm text-[#dfe2f1]">{missedCount} {missedCount === 1 ? 'card' : 'cards'} pending review.</p>
              )}
              <div className="mt-5 flex flex-col sm:flex-row gap-2">
                <button type="button" onClick={startReviewSession} disabled={!missedCount} className="flex-1 px-3 py-2.5 rounded-lg bg-[#8083ff] text-[#0d0096] text-xs font-bold disabled:opacity-40">Revisit Review Cards</button>
                <button type="button" onClick={finishSession} className="flex-1 px-3 py-2.5 rounded-lg bg-[#171b26] border border-[#464554]/50 text-[#dfe2f1] text-xs font-bold">Finish Session</button>
              </div>
            </div>
          )}

          {!cardsLoading && !cardsError && !selectedFile && (
            <p className="m-auto text-center text-sm text-[#908fa0]">
              Upload and select a processed PDF to build a grounded recall deck.
            </p>
          )}

          {!cardsLoading &&
            !cardsError &&
            selectedFile &&
            flashcards.length === 0 && (
              <p className="m-auto text-center text-sm text-[#908fa0]">
                No study cards were generated for this document.
              </p>
            )}

          {currentCard && !cardsLoading && !sessionComplete && (
            <article className="w-full max-w-md min-h-[250px] rounded-2xl bg-[#262a35]/90 border border-[#464554]/40 p-6 flex flex-col gap-5 shadow-xl">
              <span className="text-[10px] font-bold text-[#c0c1ff] tracking-wider uppercase">
                {revealed ? 'Answer' : 'Question'}
              </span>

              <div className="min-w-0 text-sm text-[#dfe2f1] leading-relaxed">
                <MarkdownAnswer>
                  {revealed
                    ? currentCard.answer || 'No answer was provided.'
                    : currentCard.question || 'No question was provided.'}
                </MarkdownAnswer>
              </div>

              {!revealed && (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="mt-auto px-4 py-2 rounded-lg bg-[#8083ff] text-[#0d0096] text-xs font-bold"
                >
                  Reveal Answer
                </button>
              )}

              {revealed && (
                <div className="mt-auto flex gap-3">
                  <button
                    type="button"
                    onClick={() => rateCard(false)}
                    className="flex-1 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-400/40 text-rose-300 text-xs font-bold"
                  >
                    Review Again
                  </button>

                  <button
                    type="button"
                    onClick={() => rateCard(true)}
                    className="flex-1 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 text-xs font-bold"
                  >
                    Know It
                  </button>
                </div>
              )}
            </article>
          )}

          {flashcards.length > 0 && !cardsLoading && !sessionComplete && (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => moveCard(-1)}
                className="px-3 py-2 rounded-lg bg-[#262a35] border border-[#464554]/40 text-xs font-bold text-[#dfe2f1]"
              >
                Previous
              </button>

              <button
                type="button"
                onClick={startReviewSession}
                className="px-3 py-2 rounded-lg bg-[#262a35] border border-[#464554]/40 text-xs font-bold text-[#dfe2f1] disabled:opacity-40"
                disabled={!missedCount}
              >
                Review Missed
              </button>

              <button
                type="button"
                onClick={restartDeck}
                className="px-3 py-2 rounded-lg bg-[#262a35] border border-[#464554]/40 text-xs font-bold text-[#dfe2f1]"
              >
                Restart
              </button>

              <button
                type="button"
                onClick={() => moveCard(1)}
                className="px-3 py-2 rounded-lg bg-[#262a35] border border-[#464554]/40 text-xs font-bold text-[#dfe2f1]"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
