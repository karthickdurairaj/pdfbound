import { useRef, useState } from 'react';
import { formatBytes, validatePdf } from '../api.js';

/**
 * Shared building blocks for the tool pages:
 * a drag-and-drop zone, a file list, and loading/error/success state.
 * `multiple` enables multi-file pickers (Merge). Everything else is single-file.
 */
export function Dropzone({ multiple, onFiles, label, accept = 'application/pdf,.pdf', validate = validatePdf, hint = 'PDF only · max 50 MB per file', icon = '📄' }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (list) => {
    const files = Array.from(list || []);
    const bad = files.map(validate).find(Boolean);
    if (bad) { onFiles([], bad); return; }
    onFiles(files, null);
  };

  return (
    <div
      className={`dropzone${dragging ? ' dragging' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current.click()}
      onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current.click(); }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />
      <div style={{ fontSize: '2rem' }}>{icon}</div>
      <p><strong>{label || 'Drop PDF file(s) here, or click to browse'}</strong></p>
      <p>{hint}</p>
    </div>
  );
}

export function FileList({ files, onRemove, onMove }) {
  if (!files.length) return null;
  return (
    <ul className="file-list">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`}>
          <span className="name">{i + 1}. {f.name}</span>
          <span className="size">{formatBytes(f.size)}</span>
          {onMove && (
            <>
              <button type="button" className="btn secondary small" disabled={i === 0} onClick={() => onMove(i, -1)}>↑</button>
              <button type="button" className="btn secondary small" disabled={i === files.length - 1} onClick={() => onMove(i, 1)}>↓</button>
            </>
          )}
          {onRemove && <button type="button" className="btn secondary small" onClick={() => onRemove(i)}>Remove</button>}
        </li>
      ))}
    </ul>
  );
}

/** Shown on tools that run entirely in the browser. */
export function LocalBadge() {
  return (
    <p className="local-badge">🔒 Processed on your device — your files are never uploaded.</p>
  );
}

/** Shared status line: loading spinner text, error box, or success message. */
export function Status({ loading, error, success }) {
  if (loading) return <p aria-live="polite">Working on your PDF…</p>;
  if (error) return <div className="error" role="alert">{error}</div>;
  if (success) return <div className="success" role="status">{success}</div>;
  return null;
}
