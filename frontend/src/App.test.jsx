import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { getDocuments } from './api';

jest.mock('./api', () => ({
  getDocuments: jest.fn(),
  getDocumentOverview: jest.fn(),
}));
jest.mock('./components/MathText', () => () => null);
jest.mock('./components/RightPanel', () => () => null);
jest.mock('./workspaces/ReaderWorkspace', () => ({ __esModule: true, ReaderWorkspace: () => null, default: ({ overviewContent }) => <div>{overviewContent?.(() => {}, 0)}</div> }));
jest.mock('./components/ui/AppShell', () => ({ AppShell: ({ children }) => <div>{children}</div> }));
jest.mock('./components/ui/Button', () => ({ Button: ({ children, ...props }) => <button {...props}>{children}</button> }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

test('hydrates persisted library at startup with API metadata', async () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  getDocuments.mockResolvedValueOnce([{ document_id: 'persisted', filename: 'Persisted.pdf', page_count: 5, ocr_used: false, extracted_pages: 5, created_at: null, has_overview: false, has_flashcards: false }]);
  try {
    await act(async () => root.render(<App />));
    expect(getDocuments).toHaveBeenCalledTimes(1);
    expect(host.textContent).toContain('Persisted.pdf');
    expect(host.textContent).toContain('5 pages');
  } finally { await act(async () => root.unmount()); host.remove(); }
});

test('startup library failure is visible and retryable', async () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  getDocuments.mockRejectedValueOnce(new Error('Library unavailable')).mockResolvedValueOnce([]);
  try {
    await act(async () => root.render(<App />));
    expect(host.textContent).toContain('Library unavailable');
    const retry = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Retry');
    await act(async () => retry.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(getDocuments).toHaveBeenCalledTimes(2);
    expect(host.textContent).toContain('No documents uploaded yet');
  } finally { await act(async () => root.unmount()); host.remove(); }
});
