import { useState } from 'react';
import { formatBytes, postJson } from '../api.js';
import { Dropzone, FileList, Status } from '../components/ToolShell.jsx';

export default function PdfInfo() {
  const [files, setFiles] = useState([]);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onInspect = async () => {
    if (!files.length) { setError('Upload a PDF first.'); return; }
    setLoading(true); setError(''); setInfo(null);
    try {
      const form = new FormData();
      form.append('file', files[0]);
      setInfo(await postJson('/api/pdf/info', form));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const rows = info ? [
    ['File name', info.fileName],
    ['File size', formatBytes(info.fileSize)],
    ['Pages', String(info.pageCount)],
    ['Title', info.title || '—'],
    ['Author', info.author || '—'],
    ['Creator', info.creator || '—'],
    ['Producer', info.producer || '—'],
    ['Encrypted', info.encrypted ? 'Yes' : 'No'],
  ] : [];

  return (
    <div className="tool-page">
      <h1>PDF Info</h1>
      <p className="lede">Page count, title, author and metadata of any PDF.</p>
      <div className="panel">
        <Dropzone onFiles={(picked, err) => { setError(err || ''); setInfo(null); if (picked.length) setFiles(picked.slice(0, 1)); }} />
        <FileList files={files} onRemove={() => { setFiles([]); setInfo(null); }} />
        <div className="btn-row">
          <button className="btn" disabled={loading || !files.length} onClick={onInspect}>{loading ? 'Reading…' : 'Show PDF info'}</button>
        </div>
        <Status loading={loading} error={error} />
        {info && (
          <table className="info-table">
            <tbody>
              {rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
