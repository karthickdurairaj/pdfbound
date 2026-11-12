import { useState } from 'react';
import { postDownload } from '../api.js';
import { Dropzone, FileList, Status } from '../components/ToolShell.jsx';

export default function ProtectPdf() {
  const [files, setFiles] = useState([]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowCopy, setAllowCopy] = useState(true);
  const [allowEdit, setAllowEdit] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onProtect = async () => {
    if (!files.length) { setError('Upload a PDF first.'); return; }
    if (password.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const form = new FormData();
      form.append('file', files[0]);
      form.append('password', password);
      form.append('allowPrint', String(allowPrint));
      form.append('allowCopy', String(allowCopy));
      form.append('allowEdit', String(allowEdit));
      const base = files[0].name.replace(/\.pdf$/i, '');
      const name = await postDownload('/api/pdf/protect', form, `${base}-protected.pdf`);
      setSuccess(`Downloaded ${name}. Keep your password safe — it can't be recovered.`);
      setPassword(''); setConfirm('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const type = show ? 'text' : 'password';

  return (
    <div className="tool-page">
      <h1>Protect PDF</h1>
      <p className="lede">Add a password so only people who know it can open your PDF. Encrypted with AES-256.</p>
      <div className="panel">
        <Dropzone onFiles={(picked, err) => { setError(err || ''); setSuccess(''); if (picked.length) setFiles(picked.slice(0, 1)); }} />
        <FileList files={files} onRemove={() => setFiles([])} />
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type={type} value={password} autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" />
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input id="confirm" type={type} value={confirm} autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)} />
          <div className="radio-row" style={{ marginTop: 8 }}>
            <label><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show password</label>
          </div>
        </div>
        <div className="field">
          <label>Once opened, allow people to:</label>
          <div className="radio-row">
            <label><input type="checkbox" checked={allowPrint} onChange={(e) => setAllowPrint(e.target.checked)} /> Print</label>
            <label><input type="checkbox" checked={allowCopy} onChange={(e) => setAllowCopy(e.target.checked)} /> Copy text</label>
            <label><input type="checkbox" checked={allowEdit} onChange={(e) => setAllowEdit(e.target.checked)} /> Edit</label>
          </div>
          <div className="hint">Most PDF apps respect these limits, but some ignore them. The password to open is the real protection.</div>
        </div>
        <div className="btn-row">
          <button className="btn" disabled={loading || !files.length} onClick={onProtect}>{loading ? 'Protecting…' : 'Protect PDF'}</button>
        </div>
        <Status loading={loading} error={error} success={success} />
      </div>
    </div>
  );
}
