package com.pdfbound;

import java.io.File;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.vertx.core.AbstractVerticle;
import io.vertx.core.Promise;
import io.vertx.core.buffer.Buffer;
import io.vertx.core.http.HttpMethod;
import io.vertx.core.json.JsonArray;
import io.vertx.core.json.JsonObject;
import io.vertx.ext.web.FileUpload;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import io.vertx.ext.web.handler.BodyHandler;
import io.vertx.ext.web.handler.CorsHandler;

/**
 * Vert.x HTTP verticle: Router + CORS + multipart BodyHandler on port 8080.
 * PDF work runs on blocking handlers (PDFBox is blocking I/O), so the event
 * loop is never stalled. Uploaded temp files are deleted after each request.
 */
public class PdfToolsVerticle extends AbstractVerticle {

  private static final long MAX_BODY = 100L * 1024 * 1024; // 100 MB
  private static final ObjectMapper MAPPER = new ObjectMapper();

  @Override
  public void start(Promise<Void> startPromise) {
    int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "8080"));
    String uploadDir = System.getenv().getOrDefault("UPLOAD_DIR", "/tmp/pdfbound-uploads");
    new File(uploadDir).mkdirs();

    Router router = Router.router(vertx);

    // CORS: allowed origins come from CORS_ORIGINS (comma-separated).
    // Defaults to the Vite dev server; production sets https://pdfbound.com etc.
    String corsEnv = System.getenv().getOrDefault("CORS_ORIGINS",
      "http://localhost:3000,http://127.0.0.1:3000");
    CorsHandler cors = CorsHandler.create();
    for (String origin : corsEnv.split(",")) {
      if (!origin.isBlank()) cors.addOrigin(origin.trim());
    }
    router.route().handler(cors
      .allowedMethod(HttpMethod.GET)
      .allowedMethod(HttpMethod.POST)
      .allowedMethod(HttpMethod.OPTIONS)
      .allowedHeader("Content-Type")
      .allowedHeader("Authorization"));

    router.route().handler(BodyHandler.create()
      .setUploadsDirectory(uploadDir)
      .setBodyLimit(MAX_BODY)
      .setDeleteUploadedFilesOnEnd(true));

    // --- JSON endpoints --------------------------------------------------
    router.get("/api/health").handler(ctx ->
      ctx.response().putHeader("Content-Type", "application/json")
        .end(new JsonObject().put("status", "ok").put("service", "pdfbound").put("version", "1.0.0").encode()));

    router.get("/api/tools").handler(ctx ->
      ctx.response().putHeader("Content-Type", "application/json").end(toolsJson()));

    // --- PDF endpoints (blocking: PDFBox does file I/O) ------------------
    router.post("/api/pdf/info").blockingHandler(ctx -> {
      try {
        File file = requireSingleUpload(ctx, "file");
        Map<String, Object> info = PdfService.info(file);
        sendJson(ctx, 200, info);
      } catch (Exception e) { handleError(ctx, e); }
    });

    router.post("/api/pdf/merge").blockingHandler(ctx -> {
      try {
        List<File> files = requireUploads(ctx, "files", 2);
        sendPdf(ctx, PdfService.merge(files), "merged.pdf");
      } catch (Exception e) { handleError(ctx, e); }
    });

    router.post("/api/pdf/split").blockingHandler(ctx -> {
      try {
        File file = requireSingleUpload(ctx, "file");
        String ranges = ctx.request().getFormAttribute("ranges");
        String every = ctx.request().getFormAttribute("every");
        if ((ranges == null || ranges.isBlank()) && (every == null || every.isBlank())) {
          throw new IllegalArgumentException("Provide ranges (e.g. \"1-3,4-6\") or every (N).");
        }
        byte[] zip = PdfService.splitToZip(file, ranges, every);
        sendFile(ctx, zip, "application/zip", "split.zip");
      } catch (Exception e) { handleError(ctx, e); }
    });

    router.post("/api/pdf/compress").blockingHandler(ctx -> {
      try {
        File file = requireSingleUpload(ctx, "file");
        String level = ctx.request().getFormAttribute("level");
        sendPdf(ctx, PdfService.compress(file, level), "compressed.pdf");
      } catch (Exception e) { handleError(ctx, e); }
    });

    router.post("/api/pdf/rotate").blockingHandler(ctx -> {
      try {
        File file = requireSingleUpload(ctx, "file");
        String pages = ctx.request().getFormAttribute("pages");
        String angleRaw = ctx.request().getFormAttribute("angle");
        int angle = angleRaw == null ? 90 : Integer.parseInt(angleRaw.trim());
        sendPdf(ctx, PdfService.rotate(file, pages, angle), "rotated.pdf");
      } catch (NumberFormatException e) {
        sendError(ctx, 400, "angle must be 90, 180 or 270.");
      } catch (Exception e) { handleError(ctx, e); }
    });

    router.post("/api/pdf/extract").blockingHandler(ctx -> {
      try {
        File file = requireSingleUpload(ctx, "file");
        sendPdf(ctx, PdfService.extract(file, ctx.request().getFormAttribute("pages")), "extracted.pdf");
      } catch (Exception e) { handleError(ctx, e); }
    });

    router.post("/api/pdf/delete-pages").blockingHandler(ctx -> {
      try {
        File file = requireSingleUpload(ctx, "file");
        sendPdf(ctx, PdfService.deletePages(file, ctx.request().getFormAttribute("pages")), "cleaned.pdf");
      } catch (Exception e) { handleError(ctx, e); }
    });

    // Unknown routes under /api get JSON 404, not an HTML page.
    router.route("/api/*").handler(ctx -> sendError(ctx, 404, "Unknown API route: " + ctx.request().path()));

    vertx.createHttpServer()
      .requestHandler(router)
      .listen(port)
      .onSuccess(server -> {
        System.out.println("PDFBound backend listening on port " + port);
        startPromise.complete();
      })
      .onFailure(startPromise::fail);
  }

  // --- helpers -----------------------------------------------------------

  private String toolsJson() {
    JsonArray tools = new JsonArray();
    tools.add(tool("merge", "Merge PDF", "Combine several PDFs into one.", "POST /api/pdf/merge"));
    tools.add(tool("split", "Split PDF", "Split a PDF into ranges, or every N pages (ZIP).", "POST /api/pdf/split"));
    tools.add(tool("compress", "Compress PDF", "Re-save a PDF with compression.", "POST /api/pdf/compress"));
    tools.add(tool("rotate", "Rotate PDF", "Rotate pages 90, 180 or 270 degrees.", "POST /api/pdf/rotate"));
    tools.add(tool("extract", "Extract Pages", "Extract selected pages into a new PDF.", "POST /api/pdf/extract"));
    tools.add(tool("delete-pages", "Delete Pages", "Remove selected pages from a PDF.", "POST /api/pdf/delete-pages"));
    tools.add(tool("info", "PDF Info", "Page count, title, author and metadata.", "POST /api/pdf/info"));
    tools.add(tool("protect", "Protect / Unlock", "Password-protect or unlock a PDF (coming soon).", null));
    return tools.encode();
  }

  private JsonObject tool(String id, String name, String description, String endpoint) {
    JsonObject t = new JsonObject().put("id", id).put("name", name).put("description", description);
    if (endpoint != null) t.put("endpoint", endpoint);
    return t;
  }

  /** Single multipart "file" upload, validated as a PDF. */
  private File requireSingleUpload(RoutingContext ctx, String field) {
    List<FileUpload> uploads = ctx.fileUploads().stream()
      .filter(u -> u.name().equals(field)).toList();
    if (uploads.isEmpty()) throw new IllegalArgumentException("Missing file upload (field \"" + field + "\").");
    return validatePdf(uploads.get(0));
  }

  /** Multiple multipart "files" uploads, at least `min` of them. */
  private List<File> requireUploads(RoutingContext ctx, String field, int min) {
    List<File> files = new ArrayList<>();
    for (FileUpload u : ctx.fileUploads()) {
      if (u.name().equals(field)) files.add(validatePdf(u));
    }
    if (files.size() < min) {
      throw new IllegalArgumentException("Upload at least " + min + " PDF files (field \"" + field + "\").");
    }
    return files;
  }

  /**
   * Validate using the ORIGINAL client filename / content type, plus the PDF
   * magic header. (uploadedFileName() is a random temp name with no extension.)
   */
  private File validatePdf(FileUpload upload) {
    File file = new File(upload.uploadedFileName());
    String original = upload.fileName() == null ? "" : upload.fileName().toLowerCase();
    String type = upload.contentType() == null ? "" : upload.contentType().toLowerCase();
    if (!file.exists() || file.length() == 0) {
      throw new IllegalArgumentException("Uploaded file is empty.");
    }
    if (file.length() > 50L * 1024 * 1024) {
      throw new IllegalArgumentException("File is over the 50 MB limit.");
    }
    boolean looksLikePdf = original.endsWith(".pdf") || type.equals("application/pdf");
    if (!looksLikePdf || !hasPdfHeader(file)) {
      throw new IllegalArgumentException("Only PDF files are accepted.");
    }
    return file;
  }

  /** True if the file starts with "%PDF-". */
  private boolean hasPdfHeader(File file) {
    try (java.io.InputStream in = new java.io.FileInputStream(file)) {
      byte[] head = in.readNBytes(5);
      return head.length == 5 && new String(head, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-");
    } catch (java.io.IOException e) {
      return false;
    }
  }

  private void sendPdf(RoutingContext ctx, byte[] bytes, String filename) {
    sendFile(ctx, bytes, "application/pdf", filename);
  }

  private void sendFile(RoutingContext ctx, byte[] bytes, String contentType, String filename) {
    ctx.response()
      .putHeader("Content-Type", contentType)
      .putHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"")
      .putHeader("Content-Length", String.valueOf(bytes.length))
      .end(Buffer.buffer(bytes));
  }

  private void sendJson(RoutingContext ctx, int status, Map<String, Object> body) {
    try {
      ctx.response().setStatusCode(status)
        .putHeader("Content-Type", "application/json")
        .end(MAPPER.writeValueAsString(body));
    } catch (Exception e) {
      sendError(ctx, 500, "Failed to encode response.");
    }
  }

  private void sendError(RoutingContext ctx, int status, String message) {
    if (ctx.response().ended()) return;
    ctx.response().setStatusCode(status)
      .putHeader("Content-Type", "application/json")
      .end(new JsonObject().put("error", message).encode());
  }

  private void handleError(RoutingContext ctx, Exception e) {
    if (e instanceof IllegalArgumentException) sendError(ctx, 400, e.getMessage());
    else if (e.getMessage() != null && e.getMessage().contains("exceeds")) sendError(ctx, 413, "Upload is too large (max 100 MB per request).");
    else {
      System.err.println("PDFBound error: " + e);
      sendError(ctx, 500, "Failed to process PDF: " + e.getMessage());
    }
  }
}
