# PDFBound

Free PDF tools in your browser: merge, split, compress, rotate, extract pages,
delete pages, and inspect PDF metadata. Upload a PDF, get a processed file back —
no account, no files kept.

> Recreated as a PDF toolkit hub (in the spirit of the referenced `pdfnest.html`).
> The original Mac-local file was not available in this workspace, so this is a
> fresh, complete MVP built from the name and the requested stack.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router, plain CSS (no UI library) |
| Backend | Java 21, Vert.x 4.5.10 (`io.vertx.ext.web.Router`), Apache PDFBox 3.0.3, Maven |
| Serving | Docker Compose — frontend on nginx (:3000), backend (:8080), nginx proxies `/api` to the backend |

## Structure

```
pdfbound-fullstack/
├── docker-compose.yml          # backend:8080, frontend:3000
├── .env.example
├── frontend/                   # React + Vite
│   ├── Dockerfile              # node build → nginx serve
│   ├── nginx.conf              # SPA fallback + /api proxy to backend:8080
│   ├── vite.config.js          # dev server :3000, /api proxy to localhost:8080
│   └── src/
│       ├── App.jsx             # routes + header/footer
│       ├── api.js              # fetch/FormData helpers, validation, downloads
│       ├── components/ToolShell.jsx   # dropzone, file list, status
│       └── pages/              # Home, MergePdf, SplitPdf, CompressPdf,
│                               #   RotatePdf, ExtractPages, DeletePages, PdfInfo
└── backend/                    # Java 21 + Vert.x + PDFBox
    ├── Dockerfile              # maven build → temurin 21-jre fat jar
    ├── pom.xml                 # Java 21, vertx-core/web, pdfbox, jackson
    └── src/main/java/com/pdfbound/
        ├── Main.java           # starts Vert.x, deploys PdfToolsVerticle
        ├── PdfToolsVerticle.java  # Router, CORS, BodyHandler, all /api routes
        ├── PdfService.java     # PDFBox operations (merge/split/compress/…)
        └── PageSpec.java       # parses "1,3-5" / "all" / "1-3,4-6"
```

## Run with Docker (recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080/api/health

Stop with `docker compose down`.

## Run locally without Docker

Prerequisites: Node 20+, Java 21, Maven 3.9+.

```bash
# Backend (port 8080)
cd backend
mvn package -DskipTests
java -jar target/pdfbound-backend-1.0.0.jar

# Frontend (port 3000, in a second terminal)
cd frontend
npm install
npm run dev
```

## API

Base URL: `http://localhost:8080` (or `/api` through the frontend proxy).

| Method | Endpoint | Input | Output |
|---|---|---|---|
| GET | `/api/health` | — | `{"status":"ok","service":"pdfbound","version":"1.0.0"}` |
| GET | `/api/tools` | — | JSON list of tools (id, name, description, endpoint) |
| POST | `/api/pdf/info` | multipart `file` | JSON: pageCount, title, author, creator, producer, fileSize, encrypted |
| POST | `/api/pdf/merge` | multipart `files` (≥2) | Merged PDF download |
| POST | `/api/pdf/split` | multipart `file`, form `ranges` e.g. `1-3,4-6` **or** `every` N | ZIP download, one PDF per part |
| POST | `/api/pdf/compress` | multipart `file`, form `level` low\|medium\|high | Compressed PDF download |
| POST | `/api/pdf/rotate` | multipart `file`, form `pages` e.g. `1,3-5` or `all`, `angle` 90\|180\|270 | Rotated PDF download |
| POST | `/api/pdf/extract` | multipart `file`, form `pages` e.g. `1,3-5` | PDF with only those pages |
| POST | `/api/pdf/delete-pages` | multipart `file`, form `pages` e.g. `2,4-5` | PDF without those pages |
| POST | `/api/pdf/protect` | multipart `file`, form `password` (≥4 chars), optional `allowPrint`/`allowCopy`/`allowEdit` true\|false (default true) | AES-256 encrypted PDF |
| POST | `/api/pdf/unlock` | multipart `file`, form `password` | PDF with the password removed |

Errors are JSON: `{"error": "..."}` — 400 bad input, 413 oversize, 500 otherwise.

### curl examples

```bash
# Health
curl http://localhost:8080/api/health

# PDF info
curl -F "file=@sample.pdf" http://localhost:8080/api/pdf/info

# Merge two PDFs
curl -F "files=@a.pdf" -F "files=@b.pdf" \
  http://localhost:8080/api/pdf/merge -o merged.pdf

# Split into ranges (ZIP)
curl -F "file=@sample.pdf" -F "ranges=1-3,4-6" \
  http://localhost:8080/api/pdf/split -o split.zip

# Split every 2 pages
curl -F "file=@sample.pdf" -F "every=2" \
  http://localhost:8080/api/pdf/split -o split.zip

# Compress
curl -F "file=@sample.pdf" -F "level=medium" \
  http://localhost:8080/api/pdf/compress -o compressed.pdf

# Rotate pages 1 and 3-5 by 90°
curl -F "file=@sample.pdf" -F "pages=1,3-5" -F "angle=90" \
  http://localhost:8080/api/pdf/rotate -o rotated.pdf

# Extract pages 1 and 3-5
curl -F "file=@sample.pdf" -F "pages=1,3-5" \
  http://localhost:8080/api/pdf/extract -o extracted.pdf

# Delete page 2
curl -F "file=@sample.pdf" -F "pages=2" \
  http://localhost:8080/api/pdf/delete-pages -o cleaned.pdf
```

## Limitations

- **No auth, no persistence.** Files are processed in memory / temp uploads
  (`/tmp/pdfbound-uploads`) and deleted after each request.
- **Compress is a re-save, not image downsampling.** PDFBox re-saves streams
  compressed; text-heavy PDFs may shrink only a little, and embedded images
  are not recompressed.
- **Protect PDF uses AES-256** with a random, never-shown owner password.
  Print/copy/edit limits are honoured by most viewers but not enforced by all;
  the open password is the real protection. Passwords are never logged.
- **Limits:** 50 MB per file (client + server validation), 100 MB per request
  body. Other tools reject password-protected PDFs; use Unlock PDF first.
