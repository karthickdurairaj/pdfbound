import { useState } from 'react';
import { downloadBlob } from '../api.js';
import { rotatePdf } from '../pdfLocal.js';
import { Dropzone, FileList, LocalBadge, Status } from '../components/ToolShell.jsx';

export default function RotatePdf() {
  const [files, setFiles] = useState([]);
  const [pages, setPages] = useState('all');
  const [angle, setAngle] = useState('90');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onRotate = async () => {
    if (!files.length) { setError('Upload a PDF first.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const { blob, name } = await rotatePdf(files[0], pages, Number(angle));
      downloadBlob(blob, name);
      setSuccess(`Downloaded ${name}.`);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="tool-page">
      <h1>Rotate PDF</h1>
      <p className="lede">Rotate pages 90°, 180° or 270° — all pages, or just the ones you pick.</p>
      <LocalBadge />
      <div className="panel">
        <Dropzone onFiles={(picked, err) => { setError(err || ''); setSuccess(''); if (picked.length) setFiles(picked.slice(0, 1)); }} />
        <FileList files={files} onRemove={() => setFiles([])} />
        <div className="field">
          <label htmlFor="pages">Pages</label>
          <input id="pages" type="text" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="all" />
          <div className="hint">“all”, or pages like 1,3-5.</div>
        </div>
        <div className="field">
          <label htmlFor="angle">Angle</label>
          <select id="angle" value={angle} onChange={(e) => setAngle(e.target.value)}>
            <option value="90">90° clockwise</option>
            <option value="180">180°</option>
            <option value="270">270° clockwise</option>
          </select>
        </div>
        <div className="btn-row">
          <button className="btn" disabled={loading || !files.length} onClick={onRotate}>{loading ? 'Rotating…' : 'Rotate PDF'}</button>
        </div>
        <Status loading={loading} error={error} success={success} />
      </div>
    </div>
  );
}
