import { validateImage, validatePdf } from './api.js';

// Carries files dropped on the home page to the tool the user picks next.
// Files stay in memory in this tab only; nothing is uploaded or stored.
let pending = null;

export function handOffFiles(files) {
  pending = Array.from(files);
}

/**
 * Files waiting for this tool, filtered by `accept` (a file → bool check).
 * Cleared on the next tick rather than immediately, so React StrictMode's
 * double call of a useState initializer sees the same files both times.
 */
export function receiveFiles(accept, { single = false } = {}) {
  if (!pending) return [];
  const files = pending.filter(accept);
  setTimeout(() => { pending = null; }, 0);
  return single ? files.slice(0, 1) : files;
}

// Ready-made checks for receiveFiles.
export const isValidPdf = (f) => !validatePdf(f);
export const isValidImage = (f) => !validateImage(f);
