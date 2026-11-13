import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatBytes, IMAGE_ACCEPT, validateImage, validatePdf } from '../api.js';
import { handOffFiles } from '../handoff.js';
import { ALL_TOOLS, TOOL_GROUPS } from '../tools.js';
import Icon from '../components/Icon.jsx';

const IMAGE_RE = /\.(jpe?g|png|gif|bmp|tiff?)$/i;
const isPdfName = (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');

/** Sort dropped files into PDFs or images, or explain what's wrong. */
function classify(files) {
  if (!files.length) return { error: '' };
  const pdfs = files.filter(isPdfName);
  if (pdfs.length === files.length) {
    const bad = pdfs.map(validatePdf).find(Boolean);
    return bad ? { error: bad } : { kind: 'pdf', files };
  }
  if (pdfs.length === 0) {
    const unknown = files.find((f) => !IMAGE_RE.test(f.name) && !/\.(heic|heif|webp)$/i.test(f.name));
    if (unknown) return { error: `"${unknown.name}" isn't a PDF or an image. PDFBound works with PDF, JPG, PNG, GIF, BMP and TIFF files.` };
    const bad = files.map(validateImage).find(Boolean);
    return bad ? { error: bad } : { kind: 'image', files };
  }
  return { error: 'Drop PDFs or images, not both at once.' };
}

function ToolCard({ tool }) {
  return (
    <Link to={tool.path} className="tool-card">
      <span className={`tool-icon tone-${tool.tone}`}><Icon name={tool.icon} /></span>
      <span className="tool-text">
        <span className="tool-name">{tool.name}</span>
        <span className="tool-desc">{tool.desc}</span>
        {tool.local && <span className="tool-local">Runs on your device</span>}
      </span>
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [picked, setPicked] = useState({ error: '' });

  const take = (list) => setPicked(classify(Array.from(list || [])));

  const open = (tool) => {
    handOffFiles(picked.files);
    navigate(tool.path);
  };

  const choices = picked.kind === 'image'
    ? ALL_TOOLS.filter((t) => t.takes === 'images')
    : picked.kind === 'pdf'
      ? ALL_TOOLS.filter((t) => t.takes !== 'images')
      : [];
  const count = picked.files?.length || 0;
  const totalSize = picked.files?.reduce((s, f) => s + f.size, 0) || 0;

  const [organize, ...rest] = TOOL_GROUPS;

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">Drop a file. We'll show you what you can do.</h1>
        <p className="hero-sub">One place for every PDF job. Free, no sign-up, and your files are never kept.</p>

        <div
          className={`hero-drop${dragging ? ' dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); take(e.dataTransfer.files); }}
        >
          <input
            ref={inputRef}
            id="hero-file"
            type="file"
            multiple
            accept={`application/pdf,.pdf,${IMAGE_ACCEPT}`}
            onChange={(e) => { take(e.target.files); e.target.value = ''; }}
          />
          <button type="button" className="hero-drop-btn" onClick={() => inputRef.current.click()}>
            <span className="hero-drop-icon"><Icon name="upload" size={26} strokeWidth={2.2} /></span>
            <span className="hero-drop-title">Choose files or drop them here</span>
            <span className="hero-drop-hint">PDF, JPG, PNG, GIF, BMP or TIFF · up to 50 MB each</span>
          </button>
        </div>

        {picked.error && <p className="hero-error" role="alert">{picked.error}</p>}

        {count > 0 ? (
          <div className="hero-next" aria-live="polite">
            <p className="hero-picked">
              <Icon name="file" size={18} />
              {count === 1 ? picked.files[0].name : `${count} ${picked.kind === 'image' ? 'images' : 'PDFs'}`}
              <span> · {formatBytes(totalSize)}</span>
              <button type="button" className="hero-clear" onClick={() => setPicked({ error: '' })}>Clear</button>
            </p>
            <p className="hero-ask">What do you want to do?</p>
            <div className="chips">
              {choices.map((t) => (
                <button key={t.id} type="button" className="chip" onClick={() => open(t)}>
                  <Icon name={t.icon} size={16} /> {t.short}
                </button>
              ))}
            </div>
            {picked.kind === 'pdf' && count > 1 && (
              <p className="hero-note">Tools other than Merge work on one file at a time and will use “{picked.files[0].name}”.</p>
            )}
          </div>
        ) : (
          <div className="hero-next">
            <p className="hero-ask">Popular</p>
            <div className="chips">
              {['merge', 'images-to-pdf', 'compress', 'split', 'protect'].map((id) => {
                const t = ALL_TOOLS.find((x) => x.id === id);
                return <Link key={id} to={t.path} className="chip"><Icon name={t.icon} size={16} /> {t.short}</Link>;
              })}
              <a href="#tools" className="chip">More…</a>
            </div>
          </div>
        )}
      </section>

      <section id="tools" className="tools" aria-labelledby="tools-title">
        <h2 id="tools-title">Or pick a tool</h2>

        <div className="tool-group" aria-labelledby={`g-${organize.id}`}>
          <h3 id={`g-${organize.id}`}>{organize.title}</h3>
          <div className="tool-grid">
            {organize.tools.map((t) => <ToolCard key={t.id} tool={{ ...t, tone: organize.tone }} />)}
          </div>
        </div>

        <div className="tool-columns">
          {rest.map((g) => (
            <div key={g.id} className="tool-group" aria-labelledby={`g-${g.id}`}>
              <h3 id={`g-${g.id}`}>{g.title}</h3>
              <div className="tool-stack">
                {g.tools.map((t) => <ToolCard key={t.id} tool={{ ...t, tone: g.tone }} />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="privacy" className="privacy-cards" aria-label="How PDFBound keeps your files private">
        <div>
          <h2>Stays on your device</h2>
          <p>Merge, split, rotate, extract and delete pages run in your browser. Nothing is uploaded.</p>
        </div>
        <div>
          <h2>Deleted after processing</h2>
          <p>Other tools use our server only to do the job, then delete the file.</p>
        </div>
        <div>
          <h2>No account, no tracking</h2>
          <p>No sign-up, cookies or ads. <Link to="/privacy">Privacy Policy</Link></p>
        </div>
      </section>
    </>
  );
}
