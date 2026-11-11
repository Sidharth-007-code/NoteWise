import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import RightPanel, { getOverlayStyle, MAXIMISED_OVERLAY_TOP } from './RightPanel';
import { askDocumentQuestion, getDocumentFlashcards } from '../api';

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
  const props = { setActiveTab: jest.fn(), initialPrompt: '', setSelectedFile: jest.fn() };
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

test('maximise toggle preserves tutor input, tabs and restores on Escape', async () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  const click = async (button) => act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  function Harness() {
    const [activeTab, setActiveTab] = React.useState('tutor');
    return <RightPanel activeTab={activeTab} setActiveTab={setActiveTab} initialPrompt="" selectedFile={null} setSelectedFile={jest.fn()} />;
  }
  try {
    await act(async () => root.render(<Harness />));
    const input = host.querySelector('textarea');
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'draft question'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await click(host.querySelector('[aria-label="Maximize panel"]'));
    expect(host.querySelector('[aria-label="Restore panel"]')).toBeTruthy();
    expect(host.querySelector('[data-maximized="true"]')).toBeTruthy();
    expect(host.querySelector('[data-maximized="true"]').classList.contains('nw-maximized')).toBe(true);
    const column = host.querySelector('[data-testid="panel-column"]');
    expect(column).toBeTruthy();
    expect(column.style.maxWidth).toBe('1000px');
    expect(column.style.marginInline).toBe('auto');
    expect(column.style.paddingInline).toBe('16px');
    const overlay = host.querySelector('[data-testid="right-panel"]');
    expect(overlay.style.position).toBe('fixed');
    expect(`${overlay.style.width} ${overlay.style.height}`).not.toMatch(/vw|vh/i);
    // jsdom drops var() values for top; verify the exact runtime source and helper instead.
    expect(MAXIMISED_OVERLAY_TOP).toBe('var(--nw-header-h, 64px)');
    expect(MAXIMISED_OVERLAY_TOP).toContain('--nw-header-h');
    expect(getOverlayStyle(true).top).toBe(MAXIMISED_OVERLAY_TOP);
    expect(host.querySelector('[aria-label="Restore panel"]').closest('[data-testid="panel-column"]')).toBe(column);
    ['AI Tutor Studio', 'Active Recall (3D)', 'Concept Quiz'].forEach((label) => {
      const tab = host.querySelector(`[aria-label="${label}"]`);
      expect(tab).toBeTruthy();
      expect(tab.closest('[hidden]')).toBeNull();
    });
    const tutorPane = host.querySelector('[data-tab-pane="tutor"]');
    expect(tutorPane.style.display).toBe('flex');
    expect(tutorPane.lastElementChild.lastElementChild.classList.contains('nw-input-row')).toBe(true);
    // jsdom drops or normalises some CSS values, so the real rendering must be checked in a browser.
    expect(['1 1 0', '1 1 0px']).toContain(host.querySelector('.nw-message-area').style.flex);
    expect(host.querySelector('.nw-message-area').style.overflowY).toBe('auto');
    expect(host.querySelector('[data-tab-pane="quiz"]').style.display).toBe('none');
    expect(host.querySelector('[data-tab-pane="recall"]').style.display).toBe('none');
    await click(host.querySelector('[aria-label="Concept Quiz"]'));
    expect(host.querySelector('[aria-label="Restore panel"]')).toBeTruthy();
    expect(host.querySelector('textarea')).toBeTruthy();
    expect(host.querySelector('[data-tab-pane="tutor"]').style.display).toBe('none');
    expect(host.querySelector('[data-tab-pane="quiz"]').style.display).toBe('flex');
    await click(host.querySelector('[aria-label="AI Tutor Studio"]'));
    expect(host.querySelector('textarea').value).toBe('draft question');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    expect(host.querySelector('[aria-label="Maximize panel"]')).toBeTruthy();
    expect(host.querySelector('[data-maximized="false"]')).toBeTruthy();
    expect(column.style.maxWidth).toBe('none');
  } finally { await act(async () => root.unmount()); host.remove(); }
});

test('clearing the selected document resets tutor input and recall cards', async () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  const props = { activeTab: 'recall', setActiveTab: jest.fn(), initialPrompt: '', setSelectedFile: jest.fn() };
  getDocumentFlashcards.mockResolvedValue({ cards: [{ question: 'Selected document card', answer: 'Answer' }] });
  try {
    await act(async () => root.render(<RightPanel {...props} activeTab="tutor" selectedFile={{ id: 'remove-me', name: 'Notes.pdf' }} />));
    const input = host.querySelector('textarea');
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'document chat draft'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => root.render(<RightPanel {...props} activeTab="recall" selectedFile={{ id: 'remove-me', name: 'Notes.pdf' }} />));
    expect(host.textContent).toContain('Selected document card');
    await act(async () => root.render(<RightPanel {...props} activeTab="recall" selectedFile={null} />));
    expect(host.textContent).not.toContain('Selected document card');
    expect(host.textContent).toContain('Upload and select a processed PDF');
    await act(async () => root.render(<RightPanel {...props} activeTab="tutor" selectedFile={null} />));
    expect(host.querySelector('textarea').value).toBe('');
  } finally { await act(async () => root.unmount()); host.remove(); }
});

test('flashcard reveal state survives switching tabs', async () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  getDocumentFlashcards.mockResolvedValue({ cards: [{ question: 'Persistent question', answer: 'Persistent answer' }] });
  try {
    await act(async () => root.render(<RightPanel activeTab="recall" setActiveTab={jest.fn()} initialPrompt="" selectedFile={{ id: 'persist', name: 'Persist.pdf' }} setSelectedFile={jest.fn()} />));
    const reveal = [...host.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Reveal Answer');
    await act(async () => reveal.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(host.textContent).toContain('Persistent answer');
    await act(async () => root.render(<RightPanel activeTab="tutor" setActiveTab={jest.fn()} initialPrompt="" selectedFile={{ id: 'persist', name: 'Persist.pdf' }} setSelectedFile={jest.fn()} />));
    expect(host.querySelector('.nw-tab-pane[hidden]')).toBeTruthy();
    await act(async () => root.render(<RightPanel activeTab="recall" setActiveTab={jest.fn()} initialPrompt="" selectedFile={{ id: 'persist', name: 'Persist.pdf' }} setSelectedFile={jest.fn()} />));
    expect(host.textContent).toContain('Persistent answer');
  } finally { await act(async () => root.unmount()); host.remove(); }
});

test('scrolls the tutor message list to its newest message without scrolling ancestors', async () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  askDocumentQuestion.mockResolvedValue({ answer: 'A grounded reply.' });
  try {
    await act(async () => root.render(<RightPanel activeTab="tutor" setActiveTab={jest.fn()} initialPrompt="" selectedFile={null} setSelectedFile={jest.fn()} />));
    const list = host.querySelector('[data-testid="tutor-message-list"]');
    Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 640 });
    const scrollTo = jest.fn(({ top }) => { list.scrollTop = top; });
    Object.defineProperty(list, 'scrollTo', { configurable: true, value: scrollTo });

    for (const question of ['First question', 'Second question']) {
      const input = host.querySelector('textarea');
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, question);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await act(async () => host.querySelector('[aria-label="Send message"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    }

    expect(host.textContent).toContain('First question');
    expect(host.textContent).toContain('Second question');
    expect(scrollTo).toHaveBeenCalled();
    expect(scrollTo.mock.calls.at(-1)[0]).toEqual(expect.objectContaining({ top: 640 }));
    expect(list.scrollTop).toBe(640);
  } finally { await act(async () => root.unmount()); host.remove(); }
});
