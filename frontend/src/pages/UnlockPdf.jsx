import { useState } from 'react';
import { postDownload } from '../api.js';
import { Dropzone, FileList, Status } from '../components/ToolShell.jsx';

export default function UnlockPdf() {
  const [files, setFiles] = useState([]);
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onUnlock = async () => {
    if (!files.length) { setError('Upload a PDF first.'); return; }
    if (!password) { setError("Enter the PDF's password."); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const form = new FormData();
      form.append('file', files[0]);
      form.append('password', password);
      const base = files[0].name.replace(/\.pdf$/i, '');
      const name = await postDownload('/api/pdf/unlock', form, `${base}-unlocked.pdf`);
      setSuccess(`Downloaded ${name}. It opens without a password now.`);
      setPassword('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="tool-page">
      <h1>Unlock PDF</h1>
      <p className="lede">Remove the password from a PDF you're allowed to open. You need its current password.</p>
      <div className="panel">
        <Dropzone onFiles={(picked, err) => { setError(err || ''); setSuccess(''); if (picked.length) setFiles(picked.slice(0, 1)); }} />
        <FileList files={files} onRemove={() => setFiles([])} />
        <div className="field">
          <label htmlFor="password">Current password</label>
          <input id="password" type={show ? 'text' : 'password'} value={password} autoComplete="off"
            onChange={(e) => setPassword(e.target.value)} />
          <div className="radio-row" style={{ marginTop: 8 }}>
            <label><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password</label>
          </div>
        </div>
        <div className="btn-row">
          <button className="btn" disabled={loading || !files.length} onClick={onUnlock}>{loading ? 'Unlocking…' : 'Unlock PDF'}</button>
        </div>
        <Status loading={loading} error={error} success={success} />
      </div>
    </div>
  );
}
