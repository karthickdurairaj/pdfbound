import { useState } from 'react';
import { postDownload } from '../api.js';
import { Dropzone, FileList, Status } from '../components/ToolShell.jsx';

export default function ExtractPages() {
  const [files, setFiles] = useState([]);
  const [pages, setPages] = useState('1,3-5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onExtract = async () => {
    if (!files.length) { setError('Upload a PDF first.'); return; }
    if (!pages.trim()) { setError('Enter the pages to extract, e.g. 1,3-5.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const form = new FormData();
      form.append('file', files[0]);
      form.append('pages', pages);
      const name = await postDownload('/api/pdf/extract', form, 'extracted.pdf');
      setSuccess(`Downloaded ${name}.`);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="tool-page">
      <h1>Extract Pages</h1>
      <p className="lede">Pull out just the pages you need into a new PDF.</p>
      <div className="panel">
        <Dropzone onFiles={(picked, err) => { setError(err || ''); setSuccess(''); if (picked.length) setFiles(picked.slice(0, 1)); }} />
        <FileList files={files} onRemove={() => setFiles([])} />
        <div className="field">
          <label htmlFor="pages">Pages to extract</label>
          <input id="pages" type="text" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="1,3-5" />
          <div className="hint">Comma-separated pages and ranges, e.g. 1,3-5. Pages keep their original order.</div>
        </div>
        <div className="btn-row">
          <button className="btn" disabled={loading || !files.length} onClick={onExtract}>{loading ? 'Extracting…' : 'Extract Pages'}</button>
        </div>
        <Status loading={loading} error={error} success={success} />
      </div>
    </div>
  );
}
