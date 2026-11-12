export const MIN_READER_ZOOM = 0.5;
export const MAX_READER_ZOOM = 2;

export function clampPage(page, pageCount) {
  const parsed = Number.parseInt(page, 10);
  return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 1, 1), Math.max(pageCount || 1, 1));
}

export function clampZoom(zoom) {
  return Math.min(MAX_READER_ZOOM, Math.max(MIN_READER_ZOOM, zoom));
}

export function readerPageKey(documentId) {
  return `notewise:last-page:${documentId}`;
}

export function visiblePdfPages(page, pageCount) {
  return [page - 1, page, page + 1].filter((candidate) => candidate >= 1 && candidate <= pageCount);
}

export function validTopicPages(pages, pageCount) {
  return (Array.isArray(pages) ? pages : [])
    .filter((page) => Number.isInteger(page) && page >= 1 && page <= pageCount);
}
