import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist/webpack.mjs';
import { FileText, PanelLeft, ZoomIn, ZoomOut } from 'lucide-react';
import { getDocumentFile, getDocumentPages } from '../api';
import { clampPage, clampZoom, readerPageKey, visiblePdfPages } from './readerState';
import './ReaderWorkspace.css';

function PdfPage({ pdf, pageNumber, scale, onError }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let task;
    let cancelled = false;
    const paint = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        task = page.render({ canvasContext: context, viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] });
        await task.promise;
      } catch (error) {
        if (!cancelled && error?.name !== 'RenderingCancelledException') onError(error);
      }
    };
    paint();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, pageNumber, scale, onError]);

  return <canvas ref={canvasRef} className="nw-reader-page" aria-label={`PDF page ${pageNumber}`} />;
}

async function outlineEntries(pdf, items) {
  const output = [];
  for (const item of items || []) {
    let page = null;
    try {
      const destination = typeof item.dest === 'string' ? await pdf.getDestination(item.dest) : item.dest;
      if (destination?.[0]) page = (await pdf.getPageIndex(destination[0])) + 1;
    } catch (_) { /* An outline item without a resolvable destination is not navigable. */ }
    output.push({ title: item.title, page, children: await outlineEntries(pdf, item.items) });
  }
  return output;
}

function OutlineItems({ items, onNavigate }) {
  return <ul className="nw-reader-outline">{items.map((item, index) => (
    <li key={`${item.title}-${index}`}>
      {item.page ? <button type="button" onClick={() => onNavigate(item.page)}>{item.title}</button> : <span>{item.title}</span>}
      {item.children.length > 0 && <OutlineItems items={item.children} onNavigate={onNavigate} />}
    </li>
  ))}</ul>;
}

export default function ReaderWorkspace({ selectedFile, overviewContent, onAskAboutPage }) {
  const [pdf, setPdf] = useState(null);
  const [textPages, setTextPages] = useState([]);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);
  const [outline, setOutline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sideTab, setSideTab] = useState('overview');
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [fitScale, setFitScale] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadedDocumentId, setLoadedDocumentId] = useState(null);
  const [progressReadyFor, setProgressReadyFor] = useState('');
  const scrollRef = useRef(null);
  const mainRef = useRef(null);
  const pageKey = selectedFile?.id ? readerPageKey(selectedFile.id) : null;

  useEffect(() => {
    if (!selectedFile?.id) {
      setPdf(null); setTextPages([]); setOutline([]); setPageCount(0); setLoadedDocumentId(null); setError(''); setLoading(false);
      return undefined;
    }
    let cancelled = false;
    let loadingTask;
    setLoading(true); setError(''); setPdf(null); setTextPages([]); setOutline([]); setPageCount(0); setLoadedDocumentId(null); setProgressReadyFor('');
    (async () => {
      try {
        const data = await getDocumentFile(selectedFile.id);
        if (cancelled) return;
        loadingTask = pdfjs.getDocument({ data });
        const loadedPdf = await loadingTask.promise;
        if (cancelled) { await loadedPdf.destroy(); return; }
        setPdf(loadedPdf);
        setPageCount(loadedPdf.numPages);
        setLoadedDocumentId(selectedFile.id);
        let entries = [];
        try { entries = await outlineEntries(loadedPdf, await loadedPdf.getOutline()); } catch (_) { entries = []; }
        if (!cancelled) setOutline(entries);
      } catch (loadError) {
        if (cancelled) return;
        if (loadError.status === 404) {
          try {
            const data = await getDocumentPages(selectedFile.id);
            if (cancelled) return;
            setTextPages(data.pages || []);
            setPageCount(data.page_count || data.pages?.length || 0);
            setLoadedDocumentId(selectedFile.id);
          } catch (fallbackError) {
            if (!cancelled) setError(fallbackError.message || 'Could not load this document.');
          }
        } else setError(loadError.message || 'Could not load this PDF.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; loadingTask?.destroy()?.catch?.(() => {}); };
  }, [selectedFile?.id, loadAttempt]);

  useEffect(() => {
    if (!pageKey || !pageCount || loadedDocumentId !== selectedFile?.id) {
      setProgressReadyFor('');
      return;
    }
    const restored = pageKey ? Number.parseInt(localStorage.getItem(pageKey) || '1', 10) : 1;
    const nextPage = clampPage(restored, pageCount);
    setPage(nextPage); setPageInput(String(nextPage));
    setProgressReadyFor(pageKey);
  }, [pageKey, pageCount, loadedDocumentId, selectedFile?.id]);

  useEffect(() => {
    if (pageKey && pageCount > 0 && loadedDocumentId === selectedFile?.id && progressReadyFor === pageKey) {
      localStorage.setItem(pageKey, String(page));
    }
  }, [pageKey, page, pageCount, loadedDocumentId, selectedFile?.id, progressReadyFor]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main || !pdf) return undefined;
    const measure = async () => {
      const firstPage = await pdf.getPage(1);
      const width = firstPage.getViewport({ scale: 1 }).width;
      const available = main.clientWidth - 48;
      setFitScale(clampZoom(available / width));
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(main);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [pdf]);

  const scale = fitWidth ? fitScale : zoom;
  const jumpToPage = useCallback((target) => {
    const next = clampPage(target, pageCount);
    setPage(next); setPageInput(String(next));
  }, [pageCount]);
  const renderError = useCallback((renderFailure) => setError(renderFailure.message || 'Could not render this page.'), []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName) || event.target?.isContentEditable) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); jumpToPage(page + 1); }
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); jumpToPage(page - 1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [page, jumpToPage]);

  const renderedPages = useMemo(() => visiblePdfPages(page, pageCount), [page, pageCount]);
  const onScroll = () => {
    if (!scrollRef.current) return;
    const nodes = [...scrollRef.current.querySelectorAll('[data-reader-page]')];
    const center = scrollRef.current.getBoundingClientRect().top + scrollRef.current.clientHeight / 2;
    const nearest = nodes.sort((a, b) => Math.abs(a.getBoundingClientRect().top + a.clientHeight / 2 - center) - Math.abs(b.getBoundingClientRect().top + b.clientHeight / 2 - center))[0];
    const visiblePage = Number(nearest?.dataset.readerPage);
    if (visiblePage && visiblePage !== page) jumpToPage(visiblePage);
  };

  return <section className="nw-reader-workspace" aria-label="Document reader">
    <header className="nw-reader-toolbar">
      <div className="nw-reader-title"><FileText size={17} /><span title={selectedFile?.name}>{selectedFile?.name || 'Document workspace'}</span></div>
      {selectedFile && pageCount > 0 && <>
        <div className="nw-reader-pagination">
          <button type="button" onClick={() => jumpToPage(page - 1)} disabled={page <= 1} aria-label="Previous page">‹</button>
          <label><span className="sr-only">Page number</span><input aria-label="Page number" value={pageInput} inputMode="numeric" onChange={(event) => setPageInput(event.target.value)} onBlur={() => jumpToPage(pageInput)} onKeyDown={(event) => { if (event.key === 'Enter') jumpToPage(pageInput); }} /></label>
          <span>of {pageCount}</span>
          <button type="button" onClick={() => jumpToPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">›</button>
        </div>
        <div className="nw-reader-zoom">
          <button type="button" onClick={() => { setFitWidth(false); setZoom((value) => clampZoom(value - 0.1)); }} aria-label="Zoom out"><ZoomOut size={16} /></button>
          <button type="button" className={fitWidth ? 'is-active' : ''} onClick={() => setFitWidth(true)}>Fit width</button>
          <span>{Math.round((fitWidth ? scale : zoom) * 100)}%</span>
          <button type="button" onClick={() => { setFitWidth(false); setZoom((value) => clampZoom(value + 0.1)); }} aria-label="Zoom in"><ZoomIn size={16} /></button>
          <input aria-label="Zoom" type="range" min="50" max="200" step="10" value={Math.round((fitWidth ? scale : zoom) * 100)} onChange={(event) => { setFitWidth(false); setZoom(clampZoom(Number(event.target.value) / 100)); }} />
        </div>
      </>}
    </header>
    {pageCount > 0 && <div className="nw-reader-progress" role="progressbar" aria-label="Reading progress" aria-valuemin="1" aria-valuemax={pageCount} aria-valuenow={page}>
      <span style={{ width: `${(page / pageCount) * 100}%` }} />
    </div>}
    {!selectedFile ? <div className="nw-reader-message">Select a document in your Library to open it here.</div> : <div className="nw-reader-body">
      <main className="nw-reader-main" ref={mainRef}>
        {loading && <p role="status" className="nw-reader-message">Loading document…</p>}
        {error && <div role="alert" className="nw-reader-error"><p>{error}</p><button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Retry</button></div>}
        {!loading && !error && pdf && <div ref={scrollRef} className="nw-reader-pages" onScroll={onScroll}>
          {renderedPages.map((pageNumber) => <div data-reader-page={pageNumber} className={`nw-reader-page-wrap ${pageNumber === page ? 'is-current' : 'is-nearby'}`} key={pageNumber}>
            <PdfPage pdf={pdf} pageNumber={pageNumber} scale={scale} onError={renderError} />
          </div>)}
        </div>}
        {!loading && !error && !pdf && pageCount > 0 && <div className="nw-reader-text-pages" ref={scrollRef} onScroll={onScroll}>
          {textPages.filter((item) => Math.abs(item.page - page) <= 1).map((item) => <article key={item.page} data-reader-page={item.page} className={`nw-reader-text-page ${item.page === page ? 'is-current' : ''}`}><p>Page {item.page} of {pageCount}</p><div>{item.text}</div></article>)}
        </div>}
        {!loading && !error && pageCount > 0 && <div className="nw-reader-actions"><button type="button" onClick={() => onAskAboutPage(page)}>Ask about this page</button></div>}
      </main>
      <aside className="nw-reader-rail" aria-label="Document context">
        {outline.length > 0 && <div className="nw-reader-tabs">
          <button type="button" className={sideTab === 'contents' ? 'is-active' : ''} onClick={() => setSideTab('contents')}><PanelLeft size={14} /> Contents</button>
          <button type="button" className={sideTab === 'overview' ? 'is-active' : ''} onClick={() => setSideTab('overview')}>Overview</button>
        </div>}
        {outline.length > 0 && sideTab === 'contents' ? <OutlineItems items={outline} onNavigate={jumpToPage} /> : <div className="nw-reader-overview">{typeof overviewContent === 'function' ? overviewContent(jumpToPage, pageCount) : overviewContent}</div>}
      </aside>
    </div>}
  </section>;
}
