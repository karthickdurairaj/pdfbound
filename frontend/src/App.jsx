import { Link, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import MergePdf from './pages/MergePdf.jsx';
import SplitPdf from './pages/SplitPdf.jsx';
import CompressPdf from './pages/CompressPdf.jsx';
import RotatePdf from './pages/RotatePdf.jsx';
import ExtractPages from './pages/ExtractPages.jsx';
import DeletePages from './pages/DeletePages.jsx';
import PdfInfo from './pages/PdfInfo.jsx';
import ImagesToPdf from './pages/ImagesToPdf.jsx';
import Privacy from './pages/Privacy.jsx';

export default function App() {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <Link to="/" className="logo">PDF<span>Bound</span></Link>
          <nav>
            <Link to="/">All tools</Link>
            <Link to="/merge">Merge</Link>
            <Link to="/images-to-pdf">Image to PDF</Link>
            <Link to="/split">Split</Link>
            <Link to="/compress">Compress</Link>
            <Link to="/info">PDF Info</Link>
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
