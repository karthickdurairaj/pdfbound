import { useEffect, useState } from 'react';
import { IMAGE_ACCEPT, formatBytes, postDownload, validateImage } from '../api.js';
import { Dropzone, Status } from '../components/ToolShell.jsx';
import Icon from '../components/Icon.jsx';
import { isValidImage, receiveFiles } from '../handoff.js';

// Each picked image gets a preview URL so the user can see and reorder pages.
let nextId = 1;
const withPreview = (file) => ({ id: nextId++, file, url: URL.createObjectURL(file) });

export default function ImagesToPdf() {
  const [items, setItems] = useState(() => receiveFiles(isValidImage).map(withPreview));
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('auto');
  const [margin, setMargin] = useState('small');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Free preview URLs when the page closes.
  useEffect(() => () => items.forEach((it) => URL.revokeObjectURL(it.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = (picked, err) => {
    setError(err || ''); setSuccess('');
    if (picked.length) setItems((prev) => [...prev, ...picked.map(withPreview)]);
  };
  const remove = (i) => setItems((prev) => {
    URL.revokeObjectURL(prev[i].url);
    return prev.filter((_, x) => x !== i);
  });
  const move = (i, dir) => setItems((prev) => {
    const next = [...prev]; const j = i + dir;
    [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const clearAll = () => { items.forEach((it) => URL.revokeObjectURL(it.url)); setItems([]); };

  const onConvert = async () => {
    if (!items.length) { setError('Add at least 1 image.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const form = new FormData();
      items.forEach((it) => form.append('files', it.file));
      form.append('pageSize', pageSize);
      form.append('orientation', orientation);
      form.append('margin', margin);
      const name = await postDownload('/api/pdf/from-images', form, 'images.pdf');
      setSuccess(`Downloaded ${name} (${items.length} page${items.length > 1 ? 's' : ''}).`);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const totalSize = items.reduce((sum, it) => sum + it.file.size, 0);

  return (
    <div className="tool-page">
      <h1>Image to PDF</h1>
      <p className="lede">Turn JPG, PNG and other images into a PDF — one image per page, in the order you choose.</p>
      <div className="panel">
        <Dropzone
          multiple
          onFiles={addFiles}
          accept={IMAGE_ACCEPT}
          validate={validateImage}
          label="Add images"
          hint="JPG, PNG, GIF, BMP or TIFF · max 50 MB each"
        />

        {items.length > 0 && (
          <>
            <ul className="thumb-grid">
              {items.map((it, i) => (
                <li key={it.id} className="thumb">
                  <div className="frame">
                    <span className="num">{i + 1}</span>
                    <img src={it.url} alt={it.file.name} />
                  </div>
                  <div className="name" title={it.file.name}>{it.file.name}</div>
                  <div className="actions">
                    <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${it.file.name} earlier`}><Icon name="left" size={16} /></button>
                    <button type="button" className="icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${it.file.name} later`}><Icon name="right" size={16} /></button>
                    <button type="button" className="icon-btn" onClick={() => remove(i)} aria-label={`Remove ${it.file.name}`}><Icon name="close" size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0 }}>{items.length} image{items.length > 1 ? 's' : ''} · {formatBytes(totalSize)}</p>
          </>
        )}

        <div className="options-row">
          <div className="field">
            <label htmlFor="pageSize">Page size</label>
            <select id="pageSize" value={pageSize} onChange={(e) => setPageSize(e.target.value)}>
              <option value="a4">A4</option>
              <option value="letter">US Letter</option>
              <option value="fit">Same as image</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="orientation">Orientation</label>
            <select id="orientation" value={orientation} onChange={(e) => setOrientation(e.target.value)} disabled={pageSize === 'fit'}>
              <option value="auto">Auto (match each image)</option>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="margin">Margin</label>
            <select id="margin" value={margin} onChange={(e) => setMargin(e.target.value)}>
              <option value="none">None</option>
              <option value="small">Small</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>

        <div className="btn-row">
          <button className="btn" disabled={loading || !items.length} onClick={onConvert}>
            {loading ? 'Converting…' : 'Convert to PDF'}
          </button>
          {items.length > 0 && <button className="btn secondary" onClick={clearAll}>Clear all</button>}
        </div>
        <Status loading={loading} error={error} success={success} />
      </div>
    </div>
  );
}
