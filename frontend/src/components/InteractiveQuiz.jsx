import React, { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE_URL = 'http://localhost:8000';

export default function InteractiveQuiz({ selectedFile }) {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [incorrectTopics, setIncorrectTopics] = useState([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const submitRef = useRef(null);

  const resetQuiz = useCallback(() => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSelectedOptionIndex(null);
    setHasSubmitted(false);
    setScore(0);
    setIncorrectTopics([]);
    setIsComplete(false);
    setError('');
  }, []);

  useEffect(() => {
    resetQuiz();
  }, [selectedFile?.id, resetQuiz]);

  const generateQuiz = async () => {
    if (!selectedFile?.id || isLoading) return;
    setIsLoading(true);
    setError('');
    resetQuiz();
    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: selectedFile.id, document: selectedFile.name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Unable to generate the quiz. Please try again.');
      if (!Array.isArray(data) || data.length < 3 || data.length > 10) throw new Error('The server returned an invalid quiz. Please try again.');
      setQuestions(data);
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to connect to the quiz service.');
    } finally {
      setIsLoading(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const submitAnswer = useCallback(() => {
    if (!currentQuestion || hasSubmitted || selectedOptionIndex === null) return;
    setHasSubmitted(true);
    if (selectedOptionIndex === currentQuestion.correctIndex) {
      setScore((value) => value + (currentQuestion.points || 10));
    } else {
      setIncorrectTopics((topics) => [...topics, currentQuestion.topic || 'Related concept']);
    }
  }, [currentQuestion, hasSubmitted, selectedOptionIndex]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Enter' && currentQuestion && !hasSubmitted && selectedOptionIndex !== null) {
        event.preventDefault();
        submitRef.current?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [currentQuestion, hasSubmitted, selectedOptionIndex]);

  useEffect(() => { submitRef.current = submitAnswer; }, [submitAnswer]);

  const advance = () => {
    if (currentQuestionIndex === questions.length - 1) {
      setIsComplete(true);
      return;
    }
    setCurrentQuestionIndex((index) => index + 1);
    setSelectedOptionIndex(null);
    setHasSubmitted(false);
  };

  const maxScore = questions.reduce((total, question) => total + (question.points || 10), 0);
  const percentage = maxScore ? Math.round((score / maxScore) * 100) : 0;
  const remark = percentage > 80
    ? 'Mastery Achieved'
    : percentage >= 50
      ? 'Developing Proficiency'
      : 'Conceptual Review Needed';
  const uniqueIncorrectTopics = [...new Set(incorrectTopics.map((topic) => topic.trim()).filter(Boolean))];

  return (
    <section className="flex-1 min-h-0 overflow-y-auto bg-[#0f131d] text-[#dfe2f1]">
      {!selectedFile ? (
        <div className="h-full min-h-[280px] flex flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-[#8083ff]">task_alt</span>
          <p className="text-sm text-[#908fa0]">Select a processed PDF to generate a conceptual quiz.</p>
        </div>
      ) : !questions.length ? (
        <div className="h-full min-h-[320px] flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="w-14 h-14 rounded-2xl border border-[#464554]/40 bg-[#171b26] flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-[#c0c1ff]">psychology_alt</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Concept Quiz</h2>
            <p className="mt-1 max-w-sm text-sm text-[#908fa0]">A focused set of conceptual questions based on {selectedFile.name}.</p>
          </div>
          {error && <p role="alert" className="max-w-sm text-sm text-rose-300">{error}</p>}
          <button type="button" onClick={generateQuiz} disabled={isLoading} className="rounded-xl bg-[#8083ff] px-5 py-3 text-sm font-semibold text-[#0a0e18] transition hover:bg-[#c0c1ff] disabled:cursor-wait disabled:opacity-70">
            {isLoading ? <span className="inline-flex items-center gap-2"><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>Generating Quiz…</span> : 'Generate Quiz'}
          </button>
        </div>
      ) : isComplete ? (
        <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3 text-[#c0c1ff]"><span className="material-symbols-outlined text-2xl">emoji_events</span><span className="text-xs font-semibold uppercase tracking-[0.2em]">Quiz Complete</span></div>
          <h2 className="text-2xl font-bold">{remark}</h2>
          <p className="mt-2 text-sm text-[#908fa0]">You completed all {questions.length} questions.</p>
          <div className="mt-8 flex items-end justify-between"><span className="text-sm text-[#908fa0]">Your score</span><strong className="text-3xl font-bold text-[#dfe2f1]">{score} <span className="text-base font-medium text-[#908fa0]">/ {maxScore}</span></strong></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#262a35]" role="progressbar" aria-label="Quiz score" aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100"><div className="h-full rounded-full bg-gradient-to-r from-[#c0c1ff] via-[#8083ff] to-[#4cd7f6] transition-all duration-700" style={{ width: `${percentage}%` }} /></div>
          <p className="mt-2 text-right text-xs text-[#908fa0]">{percentage}%</p>
          <div className="mt-6 rounded-xl border border-[#464554]/30 bg-[#171b26] p-4">
            <h3 className="text-sm font-semibold text-[#c0c1ff]">Areas to Improve</h3>
            {uniqueIncorrectTopics.length ? (
              <>
                <p className="mt-2 text-sm text-[#dfe2f1]">Review your understanding of:</p>
                <ul className="mt-2 space-y-1.5">
                  {uniqueIncorrectTopics.map((topic) => <li key={topic} className="flex items-start gap-2 text-sm text-[#dfe2f1]"><span className="material-symbols-outlined mt-0.5 text-base text-[#4cd7f6]">arrow_right</span>{topic}</li>)}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-[#908fa0]">Revisit these concepts in your notes, then retake the quiz to check your understanding.</p>
              </>
            ) : <p className="mt-2 text-sm text-emerald-300">Perfect conceptual grasp! No specific areas to improve.</p>}
          </div>
          <button type="button" onClick={resetQuiz} className="mt-8 rounded-xl border border-[#464554]/40 bg-[#171b26] px-4 py-3 text-sm font-semibold text-[#dfe2f1] hover:border-[#8083ff]/60 hover:text-[#c0c1ff]">Retake Quiz</button>
        </div>
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="truncate text-xs font-medium text-[#908fa0]">{selectedFile.name}</span>
            <span className="shrink-0 rounded-full border border-[#464554]/40 bg-[#171b26] px-3 py-1 text-xs text-[#c0c1ff]">Question {currentQuestionIndex + 1} of {questions.length}</span>
          </div>
          <div className="mb-5 h-1.5 rounded-full bg-[#262a35]"><div className="h-full rounded-full bg-gradient-to-r from-[#c0c1ff] to-[#8083ff] transition-all" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }} /></div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4cd7f6]">{currentQuestion.topic || 'Concept Check'}</p>
          <h2 className="mb-5 text-base font-semibold leading-relaxed sm:text-lg">{currentQuestion.question}</h2>
          <div className="space-y-2.5">
            {currentQuestion.options.map((option, index) => {
              const selected = selectedOptionIndex === index;
              const correct = index === currentQuestion.correctIndex;
              let style = 'border-[#464554]/30 bg-[#1c1f2a]/40 hover:bg-[#262a35]/70 hover:border-[#8083ff]/50';
              if (!hasSubmitted && selected) style = 'border-[#8083ff]/70 bg-[#8083ff]/10 ring-1 ring-[#8083ff]/30';
              if (hasSubmitted && correct) style = 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300';
              else if (hasSubmitted && selected) style = 'border-rose-500/40 bg-rose-950/40 text-rose-300';
              return <button key={`${index}-${option}`} type="button" disabled={hasSubmitted} onClick={() => setSelectedOptionIndex(index)} className={`w-full rounded-xl border p-3.5 text-left text-sm transition ${style} disabled:cursor-default`}>
                <span className="flex items-start gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/30 text-xs font-semibold">{String.fromCharCode(65 + index)}</span><span className="flex-1 pt-0.5">{option}</span>{hasSubmitted && correct && <span className="material-symbols-outlined text-lg">check_circle</span>}{hasSubmitted && selected && !correct && <span className="material-symbols-outlined text-lg">cancel</span>}</span>
              </button>;
            })}
          </div>
          {hasSubmitted && <div className="mt-4 animate-[fadeIn_250ms_ease-out] rounded-xl border border-[#464554]/30 bg-[#171b26] p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#c0c1ff]">Explanation</p>
            <p className="text-sm leading-relaxed text-[#dfe2f1]">{currentQuestion.explanations[selectedOptionIndex]}</p>
          </div>}
          <div className="mt-5 flex items-center justify-between gap-3">
            <span className="text-xs text-[#908fa0]">Score: {score} / {maxScore}</span>
            {!hasSubmitted ? <button type="button" onClick={submitAnswer} disabled={selectedOptionIndex === null} className="rounded-xl bg-[#8083ff] px-4 py-2.5 text-sm font-semibold text-[#0a0e18] transition hover:bg-[#c0c1ff] disabled:cursor-not-allowed disabled:opacity-40">Submit Answer</button>
              : <button type="button" onClick={advance} className="rounded-xl bg-[#8083ff] px-4 py-2.5 text-sm font-semibold text-[#0a0e18] transition hover:bg-[#c0c1ff]">{currentQuestionIndex === questions.length - 1 ? 'View Results' : 'Next Question'}<span className="material-symbols-outlined ml-1 inline-block align-middle text-base">arrow_forward</span></button>}
          </div>
        </div>
      )}
    </section>
  );
}
