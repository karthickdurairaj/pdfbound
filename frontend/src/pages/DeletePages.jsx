import { useState } from 'react';
import { downloadBlob } from '../api.js';
import { deletePages } from '../pdfLocal.js';
import { Dropzone, FileList, LocalBadge, Status } from '../components/ToolShell.jsx';

export default function DeletePages() {
  const [files, setFiles] = useState([]);
  const [pages, setPages] = useState('2');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onDelete = async () => {
    if (!files.length) { setError('Upload a PDF first.'); return; }
    if (!pages.trim()) { setError('Enter the pages to delete, e.g. 2,4-5.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const { blob, name } = await deletePages(files[0], pages);
      downloadBlob(blob, name);
      setSuccess(`Downloaded ${name}.`);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="tool-page">
      <h1>Delete Pages</h1>
      <p className="lede">Remove unwanted pages from a PDF.</p>
      <LocalBadge />
      <div className="panel">
        <Dropzone onFiles={(picked, err) => { setError(err || ''); setSuccess(''); if (picked.length) setFiles(picked.slice(0, 1)); }} />
        <FileList files={files} onRemove={() => setFiles([])} />
        <div className="field">
          <label htmlFor="pages">Pages to delete</label>
          <input id="pages" type="text" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="2,4-5" />
          <div className="hint">Comma-separated pages and ranges, e.g. 2,4-5. You cannot delete every page.</div>
        </div>
        <div className="btn-row">
          <button className="btn" disabled={loading || !files.length} onClick={onDelete}>{loading ? 'Deleting…' : 'Delete Pages'}</button>
        </div>
        <Status loading={loading} error={error} success={success} />
      </div>
    </div>
  );
}
