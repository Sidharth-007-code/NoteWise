import React, { useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import LeftPanel from './LeftPanel';
import { deleteDocument, uploadPDF } from '../api';

jest.mock('../api', () => ({ uploadPDF: jest.fn(), deleteDocument: jest.fn() }));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  const [files, setFiles] = useState([{ id: 'doc-1', name: 'Notes.pdf', size: '1 MB', status: 'Processed' }]);
  const [selected, setSelected] = useState(files[0]);
  return <><span data-testid="selected">{selected?.name || 'none'}</span><LeftPanel uploadedFiles={files} setUploadedFiles={setFiles} selectedFile={selected} setSelectedFile={setSelected} /></>;
}

async function mountHarness() {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => root.render(<Harness />));
  const click = async (button) => act(async () => button.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  return { host, root, click };
}

beforeEach(() => { deleteDocument.mockReset(); uploadPDF.mockReset(); });

test('shows library loading, retryable error, empty, and filename-filter states', async () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  try {
    await act(async () => root.render(<LeftPanel uploadedFiles={[]} setUploadedFiles={() => {}} selectedFile={null} setSelectedFile={() => {}} documentsLoading />));
    expect(host.textContent).toContain('Loading your library');
    await act(async () => root.render(<LeftPanel uploadedFiles={[]} setUploadedFiles={() => {}} selectedFile={null} setSelectedFile={() => {}} documentsError="Network unavailable" onRetryDocuments={jest.fn()} />));
    expect(host.textContent).toContain('Network unavailable');
    expect(host.textContent).toContain('Retry');
    await act(async () => root.render(<LeftPanel uploadedFiles={[{ id: 'doc-1', name: 'Notes.pdf', pageCount: 8, createdAt: null, ocrUsed: true }]} setUploadedFiles={() => {}} selectedFile={null} setSelectedFile={() => {}} />));
    expect(host.textContent).toContain('8 pages');
    expect(host.textContent).toContain('Date unknown');
    expect(host.textContent).toContain('OCR applied');
    const input = host.querySelector('[aria-label="Search documents by filename"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'NOTES');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelector('[aria-label="Remove Notes.pdf"]')).toBeTruthy();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'other');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.textContent).toContain('No filenames match');
  } finally { await act(async () => root.unmount()); host.remove(); }
});

test('upload success adds and selects real ingest metadata; failure is shown', async () => {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = createRoot(host);
  function UploadHarness() {
    const [files, setFiles] = useState([]);
    const [selected, setSelected] = useState(null);
    return <><span data-testid="selected">{selected?.name || 'none'}</span><LeftPanel uploadedFiles={files} setUploadedFiles={setFiles} selectedFile={selected} setSelectedFile={setSelected} /></>;
  }
  try {
    await act(async () => root.render(<UploadHarness />));
    uploadPDF.mockResolvedValueOnce({ id: 'doc-new', filename: 'New.pdf', page_count: 3, ocr_used: true, overview: null });
    const fileInput = host.querySelector('input[type="file"]');
    const file = new File(['pdf'], 'New.pdf', { type: 'application/pdf' });
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(host.textContent).toContain('New.pdf');
    expect(host.querySelector('[data-testid="selected"]').textContent).toBe('New.pdf');
    uploadPDF.mockRejectedValueOnce(new Error('Upload failed'));
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
      await Promise.resolve();
    });
    expect(host.textContent).toContain('Upload failed');
  } finally { await act(async () => root.unmount()); host.remove(); }
});

test('confirming selected document removal calls API and clears selection', async () => {
  const { host, root, click } = await mountHarness();
  deleteDocument.mockResolvedValue({ success: true });
  try {
    await click(host.querySelector('[aria-label="Remove Notes.pdf"]'));
    expect(host.textContent).toContain('This deletes its retained PDF, extracted text, overview, flashcards and quiz');
    const confirm = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Remove');
    await click(confirm);
    expect(deleteDocument).toHaveBeenCalledWith('doc-1');
    expect(host.querySelector('[aria-label="Remove Notes.pdf"]')).toBeNull();
    expect(host.querySelector('[data-testid="selected"]').textContent).toBe('none');
  } finally { await act(async () => root.unmount()); host.remove(); }
});

test('cancelling removal does nothing and a failed request keeps the item', async () => {
  const { host, root, click } = await mountHarness();
  try {
    await click(host.querySelector('[aria-label="Remove Notes.pdf"]'));
    await click([...host.querySelectorAll('button')].find((button) => button.textContent === 'Cancel'));
    expect(deleteDocument).not.toHaveBeenCalled();
    await click(host.querySelector('[aria-label="Remove Notes.pdf"]'));
    deleteDocument.mockRejectedValueOnce(new Error('Delete failed'));
    await click([...host.querySelectorAll('button')].find((button) => button.textContent === 'Remove'));
    expect(host.querySelector('[aria-label="Remove Notes.pdf"]')).toBeTruthy();
    expect(host.textContent).toContain('Delete failed');
  } finally { await act(async () => root.unmount()); host.remove(); }
});
