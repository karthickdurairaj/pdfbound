import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import MergePdf from './pages/MergePdf.jsx';
import SplitPdf from './pages/SplitPdf.jsx';
import CompressPdf from './pages/CompressPdf.jsx';
import RotatePdf from './pages/RotatePdf.jsx';
import ExtractPages from './pages/ExtractPages.jsx';
import DeletePages from './pages/DeletePages.jsx';
import PdfInfo from './pages/PdfInfo.jsx';
import ImagesToPdf from './pages/ImagesToPdf.jsx';
import ProtectPdf from './pages/ProtectPdf.jsx';
import UnlockPdf from './pages/UnlockPdf.jsx';
import Privacy from './pages/Privacy.jsx';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // On navigation: close the phone menu and start the new page at the top.
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="logo">PDF<span>Bound</span></Link>
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
          <nav id="site-nav" className={menuOpen ? 'open' : ''}>
            <NavLink to="/" end>All tools</NavLink>
            <NavLink to="/merge">Merge</NavLink>
            <NavLink to="/images-to-pdf">Image to PDF</NavLink>
            <NavLink to="/split">Split</NavLink>
            <NavLink to="/compress">Compress</NavLink>
            <NavLink to="/protect">Protect</NavLink>
            <NavLink to="/info">PDF Info</NavLink>
          </nav>
        </div>
      </header>

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/merge" element={<MergePdf />} />
          <Route path="/images-to-pdf" element={<ImagesToPdf />} />
          <Route path="/split" element={<SplitPdf />} />
          <Route path="/compress" element={<CompressPdf />} />
          <Route path="/rotate" element={<RotatePdf />} />
          <Route path="/extract" element={<ExtractPages />} />
          <Route path="/delete-pages" element={<DeletePages />} />
          <Route path="/protect" element={<ProtectPdf />} />
          <Route path="/unlock" element={<UnlockPdf />} />
          <Route path="/info" element={<PdfInfo />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <div className="container">
          PDFBound — free PDF tools in your browser. Files are uploaded to the
          PDFBound server only to process them, and are deleted afterwards.
          No account, no files kept. · <Link to="/privacy">Privacy Policy</Link>
        </div>
      </footer>
    </>
  );
}
