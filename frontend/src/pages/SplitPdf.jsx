import { useState } from 'react';
import { postDownload } from '../api.js';
import { Dropzone, FileList, Status } from '../components/ToolShell.jsx';

export default function SplitPdf() {
  const [files, setFiles] = useState([]);
  const [mode, setMode] = useState('ranges');
  const [ranges, setRanges] = useState('1-3,4-6');
  const [every, setEvery] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onSplit = async () => {
    if (!files.length) { setError('Upload a PDF first.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const form = new FormData();
      form.append('file', files[0]);
      if (mode === 'ranges') form.append('ranges', ranges);
      else form.append('every', every);
      const name = await postDownload('/api/pdf/split', form, 'split.zip');
      setSuccess(`Downloaded ${name} — it contains one PDF per part.`);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="tool-page">
      <h1>Split PDF</h1>
      <p className="lede">Split a PDF into page ranges, or one file every N pages. You get a ZIP with one PDF per part.</p>
      <div className="panel">
        <Dropzone onFiles={(picked, err) => { setError(err || ''); setSuccess(''); if (picked.length) setFiles(picked.slice(0, 1)); }} />
        <FileList files={files} onRemove={() => setFiles([])} />
        <div className="field">
          <label>Split mode</label>
          <div className="radio-row">
            <label><input type="radio" checked={mode === 'ranges'} onChange={() => setMode('ranges')} /> Page ranges</label>
            <label><input type="radio" checked={mode === 'every'} onChange={() => setMode('every')} /> Every N pages</label>
          </div>
        </div>
        {mode === 'ranges' ? (
          <div className="field">
            <label htmlFor="ranges">Ranges</label>
            <input id="ranges" type="text" value={ranges} onChange={(e) => setRanges(e.target.value)} placeholder="1-3,4-6" />
            <div className="hint">Comma-separated ranges, e.g. 1-3,4-6 — each range becomes one PDF in the ZIP.</div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="every">Pages per file</label>
            <input id="every" type="text" inputMode="numeric" value={every} onChange={(e) => setEvery(e.target.value)} />
            <div className="hint">e.g. 1 = one PDF per page, 5 = one PDF per 5 pages.</div>
          </div>
        )}
        <div className="btn-row">
          <button className="btn" disabled={loading || !files.length} onClick={onSplit}>{loading ? 'Splitting…' : 'Split PDF'}</button>
        </div>
        <Status loading={loading} error={error} success={success} />
      </div>
    </div>
  );
}
