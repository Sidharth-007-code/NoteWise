import React, { useState } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import LeftPanel from './LeftPanel';
import { deleteDocument } from '../api';

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

beforeEach(() => { deleteDocument.mockReset(); });

test('confirming selected document removal calls API and clears selection', async () => {
  const { host, root, click } = await mountHarness();
  deleteDocument.mockResolvedValue({ success: true });
  try {
    await click(host.querySelector('[aria-label="Remove Notes.pdf"]'));
    expect(host.textContent).toContain('This deletes its text, overview, flashcards and quiz');
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
