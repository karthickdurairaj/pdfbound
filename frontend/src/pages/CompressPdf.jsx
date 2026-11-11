import { useState } from 'react';
import { postDownload } from '../api.js';
import { Dropzone, FileList, Status } from '../components/ToolShell.jsx';

export default function CompressPdf() {
  const [files, setFiles] = useState([]);
  const [level, setLevel] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onCompress = async () => {
    if (!files.length) { setError('Upload a PDF first.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const form = new FormData();
      form.append('file', files[0]);
      form.append('level', level);
      const name = await postDownload('/api/pdf/compress', form, 'compressed.pdf');
      setSuccess(`Downloaded ${name}.`);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="tool-page">
      <h1>Compress PDF</h1>
      <p className="lede">Make a PDF smaller by re-saving it with compression.</p>
      <div className="panel">
        <Dropzone onFiles={(picked, err) => { setError(err || ''); setSuccess(''); if (picked.length) setFiles(picked.slice(0, 1)); }} />
        <FileList files={files} onRemove={() => setFiles([])} />
        <div className="field">
          <label htmlFor="level">Quality</label>
          <select id="level" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="low">Low — smallest file</option>
            <option value="medium">Medium — balanced</option>
            <option value="high">High — best quality</option>
          </select>
          <div className="hint">Higher quality keeps more detail but compresses less. Image-heavy PDFs shrink the most.</div>
        </div>
        <div className="btn-row">
          <button className="btn" disabled={loading || !files.length} onClick={onCompress}>{loading ? 'Compressing…' : 'Compress PDF'}</button>
        </div>
        <Status loading={loading} error={error} success={success} />
        <div className="notice">Note: this re-saves the PDF with stream compression. It does not downsample embedded images, so text-heavy PDFs may shrink only a little.</div>
      </div>
    </div>
  );
}
