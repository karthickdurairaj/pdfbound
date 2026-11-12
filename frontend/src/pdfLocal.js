// In-browser PDF operations. Files are read and written on the user's device
// with pdf-lib — nothing is uploaded. pdf-lib and fflate are loaded on demand
// so the home page stays light.

const loadLib = () => import('@cantoo/pdf-lib');

/** Read a File into a pdf-lib document, with friendly errors. */
async function openPdf(file) {
  const { PDFDocument } = await loadLib();
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (e) {
    if (/encrypt/i.test(String(e && (e.name + e.message)))) {
      throw new Error(`"${file.name}" is password-protected. Unlock it first.`);
    }
    throw new Error(`Could not read "${file.name}" as a PDF (it may be corrupt).`);
  }
}

/** Copy the given 0-based page indexes of `src` into a new PDF; return its bytes. */
async function copyToNew(src, indexes) {
  const { PDFDocument } = await loadLib();
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, indexes);
  pages.forEach((p) => out.addPage(p));
  return out.save();
}

function parseNumber(value, spec) {
  const v = value.trim();
  if (!/^\d+$/.test(v)) throw new Error(`Invalid page number in "${spec}": "${value}".`);
  return parseInt(v, 10);
}

/** "all", "1", "1,3-5" → unique 1-based page numbers in order (same rules as the server). */
export function parsePages(spec, total) {
  if (!spec || !spec.trim()) throw new Error('Enter pages, e.g. "1,3-5" or "all".');
  const s = spec.trim().toLowerCase();
  if (s === 'all') return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set();
  for (const part of s.split(',')) {
    const p = part.trim();
    if (!p) continue;
    if (p.includes('-')) {
      const [a, b] = p.split('-', 2);
      const start = parseNumber(a, spec);
      const end = parseNumber(b, spec);
      if (start < 1 || end < start) throw new Error(`Invalid page range: "${p}".`);
      for (let i = start; i <= end; i++) pages.add(i);
    } else {
      pages.add(parseNumber(p, spec));
    }
  }
  if (!pages.size) throw new Error(`Invalid pages: "${spec}".`);
  for (const n of pages) {
    if (n < 1 || n > total) throw new Error(`Page ${n} is out of range (document has ${total} pages).`);
  }
  return [...pages];
}

/** "1-3,4-6" → [[1,3],[4,6]] (1-based, inclusive). */
export function parseRanges(spec, total) {
  if (!spec || !spec.trim()) throw new Error('Enter ranges, e.g. "1-3,4-6".');
  const out = [];
  for (const part of spec.split(',')) {
    const p = part.trim();
    if (!p) continue;
    if (p.includes('-')) {
      const [a, b] = p.split('-', 2);
      out.push([parseNumber(a, spec), parseNumber(b, spec)]);
    } else {
      const n = parseNumber(p, spec);
      out.push([n, n]);
    }
  }
  if (!out.length) throw new Error(`Invalid ranges: "${spec}".`);
  for (const [a, b] of out) {
    if (a < 1 || b < a || b > total) {
      throw new Error(`Range ${a}-${b} is out of range (document has ${total} pages).`);
    }
  }
  return out;
}

const baseName = (file) => file.name.replace(/\.pdf$/i, '') || 'document';

// --- operations: each returns { blob, name } -------------------------------

export async function mergePdfs(files) {
  const { PDFDocument } = await loadLib();
  const out = await PDFDocument.create();
  for (const file of files) {
    const src = await openPdf(file);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return { blob: pdfBlob(await out.save()), name: 'merged.pdf' };
}

export async function splitPdf(file, { ranges, every }) {
  const src = await openPdf(file);
  const total = src.getPageCount();
  let parts;
  if (ranges != null) {
    parts = parseRanges(ranges, total);
  } else {
    const n = parseNumber(String(every ?? '1'), String(every));
    if (n < 1) throw new Error('Pages per file must be at least 1.');
    parts = [];
    for (let s = 1; s <= total; s += n) parts.push([s, Math.min(s + n - 1, total)]);
  }
  const { zipSync } = await import('fflate');
  const entries = {};
  const base = baseName(file);
  for (let i = 0; i < parts.length; i++) {
    const [a, b] = parts[i];
    const idx = Array.from({ length: b - a + 1 }, (_, k) => a - 1 + k);
    // PDFs are already compressed, so store them in the ZIP without recompressing.
    entries[`${base}-part-${i + 1}.pdf`] = [await copyToNew(src, idx), { level: 0 }];
  }
  return { blob: new Blob([zipSync(entries)], { type: 'application/zip' }), name: `${base}-split.zip` };
}

export async function rotatePdf(file, pagesSpec, angle) {
  if (![90, 180, 270].includes(angle)) throw new Error('Angle must be 90, 180 or 270.');
  const { degrees } = await loadLib();
  const doc = await openPdf(file);
  for (const n of parsePages(pagesSpec, doc.getPageCount())) {
    const page = doc.getPage(n - 1);
    page.setRotation(degrees((page.getRotation().angle + angle) % 360));
  }
  return { blob: pdfBlob(await doc.save()), name: `${baseName(file)}-rotated.pdf` };
}

export async function extractPages(file, pagesSpec) {
  const src = await openPdf(file);
  const idx = parsePages(pagesSpec, src.getPageCount()).map((n) => n - 1);
  return { blob: pdfBlob(await copyToNew(src, idx)), name: `${baseName(file)}-extracted.pdf` };
}

export async function deletePages(file, pagesSpec) {
  const src = await openPdf(file);
  const total = src.getPageCount();
  const remove = new Set(parsePages(pagesSpec, total));
  if (remove.size >= total) throw new Error('Cannot delete every page of the document.');
  // Copy the pages we keep into a fresh PDF so the deleted pages' data is really gone.
  const keep = src.getPageIndices().filter((i) => !remove.has(i + 1));
  return { blob: pdfBlob(await copyToNew(src, keep)), name: `${baseName(file)}-cleaned.pdf` };
}

function pdfBlob(bytes) {
  return new Blob([bytes], { type: 'application/pdf' });
}
