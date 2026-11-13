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
import Icon from './components/Icon.jsx';

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
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="logo" aria-label="PDFBound home">pdf<span>bound</span></Link>
          <button
            type="button"
            className="menu-toggle"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
          <nav id="site-nav" className={menuOpen ? 'open' : ''} aria-label="Main">
            <NavLink to="/" end>All tools</NavLink>
            <NavLink to="/merge">Merge</NavLink>
            <NavLink to="/images-to-pdf">Image to PDF</NavLink>
            <NavLink to="/compress">Compress</NavLink>
            <NavLink to="/protect">Protect</NavLink>
            <NavLink to="/privacy">Privacy</NavLink>
          </nav>
        </div>
      </header>

      <main id="main" className="container">
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
          <p className="footer-brand"><span className="logo">pdf<span>bound</span></span> Free PDF tools. No account, no files kept.</p>
          <nav className="footer-links" aria-label="Footer">
            <Link to="/">All tools</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <a href="https://github.com/karthickdurairaj/pdfbound" rel="noopener">GitHub</a>
          </nav>
        </div>
      </footer>
    </>
  );
}
