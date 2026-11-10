import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RightPanel from './RightPanel';
import { getDocumentFlashcards } from '../api';

jest.mock('../api', () => ({
  askDocumentQuestion: jest.fn(),
  getDocumentFlashcards: jest.fn(),
}));
jest.mock('./MarkdownAnswer', () => ({ children }) => children);

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('switching documents replaces the deck and clears the prior session', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  getDocumentFlashcards.mockImplementation((id) => Promise.resolve({
    document_id: id,
    cards: [{ question: `Question from ${id}`, answer: `Answer from ${id}` }],
  }));
  const props = { activeTab: 'recall', setActiveTab: jest.fn(), initialPrompt: '', setSelectedFile: jest.fn() };
  try {
    await act(async () => {
      root.render(<RightPanel {...props} selectedFile={{ id: 'doc-a', name: 'A.pdf' }} />);
    });
    expect(host.textContent).toContain('Question from doc-a');
    const reveal = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Reveal Answer'));
    await act(async () => reveal.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const knowIt = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Know It');
    await act(async () => knowIt.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(host.textContent).toContain('Session complete!');
    expect(host.textContent).toContain('1Known');
    await act(async () => {
      root.render(<RightPanel {...props} selectedFile={{ id: 'doc-b', name: 'B.pdf' }} />);
    });
    expect(host.textContent).toContain('Question from doc-b');
    expect(host.textContent).not.toContain('Question from doc-a');
    expect(host.textContent).toContain('Known 0');
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

test('shows a useful flashcard loading error instead of demo content', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  getDocumentFlashcards.mockRejectedValueOnce(new Error('No processed text'));
  try {
    await act(async () => root.render(<RightPanel activeTab="recall" selectedFile={{ id: 'bad-doc', name: 'Empty.pdf' }} setActiveTab={jest.fn()} setSelectedFile={jest.fn()} />));
    expect(host.textContent).toContain('No processed text');
    expect(host.textContent).not.toContain('What is a Quantifier?');
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

test('ends the deck and revisits only queued cards, removing cards marked known', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  getDocumentFlashcards.mockResolvedValueOnce({ cards: [
    { question: 'Q1', answer: 'A1' },
    { question: 'Q2', answer: 'A2' },
    { question: 'Q3', answer: 'A3' },
  ] });
  const click = async (label) => {
    const button = Array.from(host.querySelectorAll('button')).find((item) => item.textContent.trim() === label);
    expect(button).toBeTruthy();
    await act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  };
  try {
    await act(async () => root.render(<RightPanel activeTab="recall" selectedFile={{ id: 'deck', name: 'Deck.pdf' }} setActiveTab={jest.fn()} setSelectedFile={jest.fn()} />));
    expect(host.textContent).toContain('Q1');
    await click('Reveal Answer'); await click('Review Again');
    expect(host.textContent).toContain('Q2');
    await click('Reveal Answer'); await click('Know It');
    expect(host.textContent).toContain('Q3');
    await click('Reveal Answer'); await click('Review Again');
    expect(host.textContent).toContain('Session complete!');
    expect(host.textContent).toContain('3Completed');
    expect(host.textContent).toContain('1Known');
    expect(host.textContent).toContain('2Review Again');

    await click('Revisit Review Cards');
    expect(host.textContent).toContain('Card 1 of 2');
    expect(host.textContent).toContain('Q1');
    await click('Reveal Answer'); await click('Know It');
    expect(host.textContent).toContain('Q3');
    await click('Reveal Answer'); await click('Review Again');
    expect(host.textContent).toContain('Review session complete!');
    expect(host.textContent).toContain('1Review Again');
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
