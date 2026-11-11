// Tiny API layer — every tool page talks to the Vert.x backend through here.
// In dev Vite proxies /api to localhost:8080; in Docker nginx does the same.
// VITE_API_URL can override the base (e.g. a deployed backend origin).
const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB client-side limit

export function validatePdf(file) {
  if (!file) return 'Please choose a PDF file.';
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return `"${file.name}" is not a PDF file.`;
  if (file.size > MAX_FILE_SIZE) return `"${file.name}" is over the 50 MB limit.`;
  return null;
}

/** Parse an error body from the backend ({error: "..."}) or fall back to HTTP status. */
async function readError(res) {
  try {
    const data = await res.json();
    if (data && data.error) return data.error;
  } catch { /* not JSON — fall through */ }
  return `Request failed (${res.status})`;
}

/** POST a FormData body and return the response as JSON. */
export async function postJson(path, formData) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** POST a FormData body and trigger a download of the returned file. */
export async function postDownload(path, formData, fallbackName) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await readError(res));
  const blob = await res.blob();
  // Prefer the filename the backend sets in Content-Disposition.
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const name = match ? match[1] : fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return name;
}

export async function fetchTools() {
  const res = await fetch(`${API_BASE}/api/tools`);
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export function formatBytes(n) {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
