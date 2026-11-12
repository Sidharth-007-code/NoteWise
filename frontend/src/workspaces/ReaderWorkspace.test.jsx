import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ReaderWorkspace from './ReaderWorkspace';
import { getDocumentFile, getDocumentPages } from '../api';

const mockPdfjs = { getDocument: jest.fn() };
jest.mock('pdfjs-dist/webpack.mjs', () => ({ getDocument: (...args) => mockPdfjs.getDocument(...args) }));
jest.mock('../api', () => ({ getDocumentFile: jest.fn(), getDocumentPages: jest.fn() }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
HTMLCanvasElement.prototype.getContext = () => ({});

function mockPdf({ outline = [] } = {}) {
  const pdf = {
    numPages: 4,
    getPage: jest.fn(async (pageNumber) => ({
      getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
      render: () => ({ promise: Promise.resolve(), cancel: jest.fn() }),
      pageNumber,
    })),
    getOutline: jest.fn(async () => outline),
    getDestination: jest.fn(async () => [{ num: 0, gen: 0 }]),
    getPageIndex: jest.fn(async () => 2),
    destroy: jest.fn(async () => {}),
  };
  mockPdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(pdf), destroy: jest.fn() });
  return pdf;
}

async function mount(props = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  const onAskAboutPage = jest.fn();
  await act(async () => root.render(<ReaderWorkspace
    selectedFile={{ id: 'doc-a', name: 'Reader.pdf' }}
    overviewContent={(jump) => <div><p>Generated overview</p><button onClick={() => jump(3)}>Topic page 3</button></div>}
    onAskAboutPage={onAskAboutPage}
    {...props}
  />));
  return { host, root, onAskAboutPage, cleanup: async () => { await act(async () => root.unmount()); host.remove(); } };
}

beforeEach(() => {
  localStorage.clear();
  getDocumentFile.mockReset().mockResolvedValue(new Uint8Array([1, 2]));
  getDocumentPages.mockReset();
  mockPdfjs.getDocument.mockReset();
  window.ResizeObserver = class { observe() {} disconnect() {} };
});

test('loads and renders only the current PDF page and its neighbors', async () => {
  mockPdf();
  const ui = await mount();
  try {
    expect(await ui.host.querySelectorAll('canvas')).toHaveLength(2);
    expect(ui.host.querySelector('[aria-label="Page number"]').value).toBe('1');
    expect(ui.host.textContent).toContain('Generated overview');
    expect([...ui.host.querySelectorAll('button')].some((button) => button.textContent.includes('Contents'))).toBe(false);
  } finally { await ui.cleanup(); }
});

test('supports previous/next, page input bounds, and keyboard navigation', async () => {
  mockPdf();
  const ui = await mount();
  try {
    const pageInput = ui.host.querySelector('[aria-label="Page number"]');
    const next = ui.host.querySelector('[aria-label="Next page"]');
    await act(async () => next.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(pageInput.value).toBe('2');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
    expect(pageInput.value).toBe('3');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(pageInput, '99');
      pageInput.dispatchEvent(new Event('input', { bubbles: true }));
      pageInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    });
    expect(pageInput.value).toBe('4');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
    expect(pageInput.value).toBe('4');
  } finally { await ui.cleanup(); }
});

test('fit width and zoom controls stay within the manual zoom bounds', async () => {
  mockPdf();
  const ui = await mount();
  try {
    const range = ui.host.querySelector('[aria-label="Zoom"]');
    const zoomIn = ui.host.querySelector('[aria-label="Zoom in"]');
    for (let index = 0; index < 20; index += 1) await act(async () => zoomIn.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(Number(range.value)).toBeLessThanOrEqual(200);
    const zoomOut = ui.host.querySelector('[aria-label="Zoom out"]');
    for (let index = 0; index < 30; index += 1) await act(async () => zoomOut.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(Number(range.value)).toBeGreaterThanOrEqual(50);
    const fit = [...ui.host.querySelectorAll('button')].find((button) => button.textContent === 'Fit width');
    await act(async () => fit.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(fit.className).toContain('is-active');
  } finally { await ui.cleanup(); }
});

test('shows Contents only for an outline and outline destinations navigate', async () => {
  mockPdf({ outline: [{ title: 'Chapter One', dest: 'chapter', items: [] }] });
  const ui = await mount();
  try {
    const contents = [...ui.host.querySelectorAll('button')].find((button) => button.textContent.includes('Contents'));
    expect(contents).toBeTruthy();
    await act(async () => contents.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const chapter = [...ui.host.querySelectorAll('button')].find((button) => button.textContent === 'Chapter One');
    await act(async () => chapter.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(ui.host.querySelector('[aria-label="Page number"]').value).toBe('3');
  } finally { await ui.cleanup(); }
});

test('topic pages navigate and Ask about this page preserves selected document context', async () => {
  mockPdf();
  const ui = await mount();
  try {
    const topic = [...ui.host.querySelectorAll('button')].find((button) => button.textContent === 'Topic page 3');
    await act(async () => topic.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const ask = [...ui.host.querySelectorAll('button')].find((button) => button.textContent === 'Ask about this page');
    await act(async () => ask.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(ui.onAskAboutPage).toHaveBeenCalledWith(3);
    expect(getDocumentFile).toHaveBeenCalledWith('doc-a');
  } finally { await ui.cleanup(); }
});

test('restores and saves last page per document', async () => {
  mockPdf();
  localStorage.setItem('notewise:last-page:doc-a', '2');
  const ui = await mount();
  try {
    expect(ui.host.querySelector('[aria-label="Page number"]').value).toBe('2');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
    expect(localStorage.getItem('notewise:last-page:doc-a')).toBe('3');
    expect(localStorage.getItem('notewise:last-page:other')).toBeNull();
  } finally { await ui.cleanup(); }
});

test('switching documents restores that document progress without overwriting either key', async () => {
  mockPdf();
  localStorage.setItem('notewise:last-page:doc-a', '4');
  localStorage.setItem('notewise:last-page:doc-b', '2');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  const props = (id) => <ReaderWorkspace selectedFile={{ id, name: `${id}.pdf` }} onAskAboutPage={() => {}} />;
  try {
    await act(async () => root.render(props('doc-a')));
    expect(host.querySelector('[aria-label="Page number"]').value).toBe('4');
    await act(async () => root.render(props('doc-b')));
    expect(host.querySelector('[aria-label="Page number"]').value).toBe('2');
    expect(localStorage.getItem('notewise:last-page:doc-a')).toBe('4');
    expect(localStorage.getItem('notewise:last-page:doc-b')).toBe('2');
  } finally { await act(async () => root.unmount()); host.remove(); }
});

test('falls back to extracted text for older documents without a retained PDF', async () => {
  mockPdf();
  const missing = new Error('missing PDF'); missing.status = 404;
  getDocumentFile.mockRejectedValueOnce(missing);
  getDocumentPages.mockResolvedValueOnce({ page_count: 2, pages: [{ page: 1, text: 'Legacy extracted page text' }, { page: 2, text: 'Second page' }] });
  const ui = await mount();
  try {
    expect(ui.host.textContent).toContain('Legacy extracted page text');
    expect(getDocumentPages).toHaveBeenCalledWith('doc-a');
  } finally { await ui.cleanup(); }
});

test('exposes loading and error states', async () => {
  mockPdf();
  let resolveFile;
  getDocumentFile.mockReturnValueOnce(new Promise((resolve) => { resolveFile = resolve; }));
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<ReaderWorkspace selectedFile={{ id: 'doc-a', name: 'Reader.pdf' }} onAskAboutPage={() => {}} />));
  expect(host.textContent).toContain('Loading document');
  await act(async () => { resolveFile(new Uint8Array([1])); });
  await act(async () => root.unmount()); host.remove();

  getDocumentFile.mockRejectedValueOnce(new Error('PDF unavailable'));
  const ui = await mount();
  try {
    expect(ui.host.textContent).toContain('PDF unavailable');
    const retry = [...ui.host.querySelectorAll('button')].find((button) => button.textContent === 'Retry');
    await act(async () => retry.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(ui.host.querySelector('[role="alert"]')).toBeNull();
    expect(ui.host.querySelectorAll('canvas')).toHaveLength(2);
  } finally { await ui.cleanup(); }
});

test('keeps the generated overview available with Reader and the tutor callback independent', async () => {
  mockPdf();
  const ui = await mount();
  try {
    expect(ui.host.textContent).toContain('Generated overview');
    expect(ui.host.querySelector('[aria-label="Document reader"]')).toBeTruthy();
  } finally { await ui.cleanup(); }
});
