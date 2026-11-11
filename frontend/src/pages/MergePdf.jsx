import { useState } from 'react';
import { postDownload } from '../api.js';
import { Dropzone, FileList, Status } from '../components/ToolShell.jsx';

export default function MergePdf() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const addFiles = (picked, err) => {
    setError(err || ''); setSuccess('');
    if (picked.length) setFiles((prev) => [...prev, ...picked]);
  };
  const move = (i, dir) => {
    setFiles((prev) => {
      const next = [...prev]; const j = i + dir;
      [next[i], next[j]] = [next[j], next[i]]; return next;
    });
  };

  const onMerge = async () => {
    if (files.length < 2) { setError('Add at least 2 PDFs to merge.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      const name = await postDownload('/api/pdf/merge', form, 'merged.pdf');
      setSuccess(`Downloaded ${name}.`);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="tool-page">
      <h1>Merge PDF</h1>
      <p className="lede">Combine several PDFs into one, in the order you choose.</p>
      <div className="panel">
        <Dropzone multiple onFiles={addFiles} label="Drop PDFs here, or click to browse" />
        <FileList files={files} onRemove={(i) => setFiles((p) => p.filter((_, x) => x !== i))} onMove={move} />
        <div className="btn-row">
          <button className="btn" disabled={loading || files.length < 2} onClick={onMerge}>
            {loading ? 'Merging…' : 'Merge PDFs'}
          </button>
          {files.length > 0 && <button className="btn secondary" onClick={() => setFiles([])}>Clear all</button>}
        </div>
        <Status loading={loading} error={error} success={success} />
      </div>
    </div>
  );
}
