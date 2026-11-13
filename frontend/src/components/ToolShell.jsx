import { useRef, useState } from 'react';
import { formatBytes, validatePdf } from '../api.js';
import Icon from './Icon.jsx';

/**
 * Shared building blocks for the tool pages:
 * a drag-and-drop zone, a file list, and loading/error/success state.
 * `multiple` enables multi-file pickers (Merge). Everything else is single-file.
 */
export function Dropzone({ multiple, onFiles, label, accept = 'application/pdf,.pdf', validate = validatePdf, hint = 'PDF only · max 50 MB per file' }) {
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
      <span className="dropzone-icon"><Icon name="upload" size={24} strokeWidth={2.2} /></span>
      <p className="dropzone-title">{label || (multiple ? 'Add PDFs' : 'Choose a PDF')}</p>
      <p className="dropzone-hint">or drop {multiple ? 'them' : 'it'} here · {hint}</p>
    </div>
  );
}

export function FileList({ files, onRemove, onMove }) {
  if (!files.length) return null;
  return (
    <ol className="file-list">
      {files.map((f, i) => (
        <li key={`${f.name}-${i}`}>
          <span className="file-num" aria-hidden="true">{i + 1}</span>
          <span className="file-badge" aria-hidden="true">PDF</span>
          <span className="file-meta">
            <span className="name">{f.name}</span>
            <span className="size">{formatBytes(f.size)}</span>
          </span>
          <span className="file-actions">
            {onMove && (
              <>
                <button type="button" className="icon-btn" disabled={i === 0} onClick={() => onMove(i, -1)} aria-label={`Move ${f.name} up`}><Icon name="up" size={16} /></button>
                <button type="button" className="icon-btn" disabled={i === files.length - 1} onClick={() => onMove(i, 1)} aria-label={`Move ${f.name} down`}><Icon name="down" size={16} /></button>
              </>
            )}
            {onRemove && <button type="button" className="icon-btn" onClick={() => onRemove(i)} aria-label={`Remove ${f.name}`}><Icon name="close" size={16} /></button>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Shown on tools that run entirely in the browser. */
export function LocalBadge() {
  return (
    <p className="local-badge"><Icon name="shield" size={16} /> Runs on your device. Your files are never uploaded.</p>
  );
}

/** Shared status line: loading spinner text, error box, or success message. */
export function Status({ loading, error, success }) {
  if (loading) return <p className="working" aria-live="polite"><span className="spinner" aria-hidden="true" /> Working on it…</p>;
  if (error) return <div className="error" role="alert">{error}</div>;
  if (success) return <div className="success" role="status">{success}</div>;
  return null;
}
