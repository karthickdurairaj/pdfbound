import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchTools } from '../api.js';

// Fallback list (shown if /api/tools is unreachable — the tools still work
// once the backend is up; this just keeps the home page useful offline).
const FALLBACK_TOOLS = [
  { id: 'merge', name: 'Merge PDF', description: 'Combine several PDFs into one, in the order you choose.', path: '/merge', icon: '🔗' },
  { id: 'images-to-pdf', name: 'Image to PDF', description: 'Turn JPG, PNG and other images into a PDF, one image per page.', path: '/images-to-pdf', icon: '🖼️' },
  { id: 'split', name: 'Split PDF', description: 'Split a PDF into ranges, or one file every N pages.', path: '/split', icon: '✂️' },
  { id: 'compress', name: 'Compress PDF', description: 'Make a PDF smaller by re-saving it with compression.', path: '/compress', icon: '🗜️' },
  { id: 'rotate', name: 'Rotate PDF', description: 'Rotate pages 90°, 180° or 270° — all pages or just some.', path: '/rotate', icon: '🔄' },
  { id: 'extract', name: 'Extract Pages', description: 'Pull out just the pages you need into a new PDF.', path: '/extract', icon: '📄' },
  { id: 'delete-pages', name: 'Delete Pages', description: 'Remove unwanted pages from a PDF.', path: '/delete-pages', icon: '🗑️' },
  { id: 'info', name: 'PDF Info', description: 'Page count, title, author and metadata of any PDF.', path: '/info', icon: 'ℹ️' },
  { id: 'protect', name: 'Protect PDF', description: 'Add a password to a PDF, with AES-256 encryption.', path: '/protect', icon: '🔒' },
  { id: 'unlock', name: 'Unlock PDF', description: 'Remove the password from a PDF you can open.', path: '/unlock', icon: '🔓' },
];

export default function Home() {
  const [tools, setTools] = useState(FALLBACK_TOOLS);
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchTools()
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          const byId = Object.fromEntries(FALLBACK_TOOLS.map((t) => [t.id, t]));
          setTools(data.map((t) => ({ ...byId[t.id], ...t, path: byId[t.id]?.path || null })));
        }
      })
      .catch(() => { /* offline fallback list stays */ });
  }, []);

  const filtered = tools.filter((t) =>
    (t.name + ' ' + t.description).toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <section className="hero">
        <h1>Every PDF tool you need, <span>in one place</span></h1>
        <p>Merge, split, compress, convert images to PDF and more — free, fast, and your files are deleted after processing.</p>
        <input
          className="search"
          type="search"
          placeholder="Search tools… e.g. merge"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tools"
        />
      </section>

      <section className="tool-grid">
        {filtered.map((tool) => {
          const card = (
            <>
              <div className="icon">{tool.icon}</div>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              <span className="tag">{tool.comingSoon ? 'Coming soon' : 'Open tool →'}</span>
            </>
          );
          return tool.comingSoon || !tool.path ? (
            <div key={tool.id} className="tool-card disabled">{card}</div>
          ) : (
            <Link key={tool.id} to={tool.path} className="tool-card">{card}</Link>
          );
        })}
        {filtered.length === 0 && <p>No tools match “{query}”.</p>}
      </section>
    </>
  );
}
