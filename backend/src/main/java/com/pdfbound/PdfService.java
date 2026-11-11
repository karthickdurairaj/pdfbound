package com.pdfbound;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.io.IOUtils;
import org.apache.pdfbox.multipdf.PDFMergerUtility;
import org.apache.pdfbox.multipdf.Splitter;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.apache.pdfbox.pdmodel.PDPage;

/**
 * Pure PDFBox operations. Each method takes uploaded temp files and returns
 * bytes for the response; callers own the temp files and delete them after.
 * PDDocument instances are always closed (try-with-resources).
 */
public final class PdfService {

  private PdfService() {}

  /** Metadata for GET-style info responses. */
  public static Map<String, Object> info(File file) throws IOException {
    try (PDDocument doc = load(file)) {
      PDDocumentInformation meta = doc.getDocumentInformation();
      Map<String, Object> out = new LinkedHashMap<>();
      out.put("fileName", file.getName());
      out.put("fileSize", file.length());
      out.put("pageCount", doc.getNumberOfPages());
      out.put("title", meta.getTitle());
      out.put("author", meta.getAuthor());
      out.put("creator", meta.getCreator());
      out.put("producer", meta.getProducer());
      out.put("encrypted", doc.isEncrypted());
      return out;
    }
  }

  public static byte[] merge(List<File> files) throws IOException {
    PDFMergerUtility merger = new PDFMergerUtility();
    for (File f : files) merger.addSource(f);
    try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      merger.setDestinationStream(out);
      merger.mergeDocuments(IOUtils.createMemoryOnlyStreamCache());
      return out.toByteArray();
    }
  }

  /** Split into one PDF per range (or per N pages); returned as a ZIP. */
  public static byte[] splitToZip(File file, String ranges, String every) throws IOException {
    try (PDDocument doc = load(file)) {
      int total = doc.getNumberOfPages();
      List<List<Integer>> parts = new ArrayList<>();
      if (ranges != null && !ranges.isBlank()) {
        for (int[] r : PageSpec.parseRanges(ranges, total)) {
          List<Integer> pages = new ArrayList<>();
          for (int i = r[0]; i <= r[1]; i++) pages.add(i);
          parts.add(pages);
        }
      } else {
        int n = parseEvery(every);
        for (int start = 1; start <= total; start += n) {
          List<Integer> pages = new ArrayList<>();
          for (int i = start; i < Math.min(start + n, total + 1); i++) pages.add(i);
          parts.add(pages);
        }
      }
      try (ByteArrayOutputStream zipBytes = new ByteArrayOutputStream();
           ZipOutputStream zip = new ZipOutputStream(zipBytes)) {
        int idx = 1;
        for (List<Integer> pages : parts) {
          byte[] partPdf = extractBytes(doc, pages);
          zip.putNextEntry(new ZipEntry("part-" + idx + ".pdf"));
          zip.write(partPdf);
          zip.closeEntry();
          idx++;
        }
        zip.finish();
        return zipBytes.toByteArray();
      }
    }
  }

  /**
   * Re-save with stream compression. Level only changes how aggressively
   * PDFBox compresses streams; it does NOT downsample embedded images,
   * so image-heavy PDFs shrink less than a true image recompressor would.
   */
  public static byte[] compress(File file, String level) throws IOException {
    try (PDDocument doc = load(file)) {
      // PDFBox 3 saves streams compressed by default; the level is kept
      // for API compatibility and future image handling.
      if (level != null && !level.isBlank()
          && !List.of("low", "medium", "high").contains(level.toLowerCase())) {
        throw new IllegalArgumentException("level must be low, medium or high.");
      }
      try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
        doc.save(out);
        return out.toByteArray();
      }
    }
  }

  public static byte[] rotate(File file, String pagesSpec, int angle) throws IOException {
    if (angle != 90 && angle != 180 && angle != 270) {
      throw new IllegalArgumentException("angle must be 90, 180 or 270.");
    }
    try (PDDocument doc = load(file)) {
      List<Integer> pages = PageSpec.parse(pagesSpec, doc.getNumberOfPages());
      for (int pageNum : pages) {
        PDPage page = doc.getPage(pageNum - 1);
        page.setRotation((page.getRotation() + angle) % 360);
      }
      try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
        doc.save(out);
        return out.toByteArray();
      }
    }
  }

  public static byte[] extract(File file, String pagesSpec) throws IOException {
    try (PDDocument doc = load(file)) {
      List<Integer> pages = PageSpec.parse(pagesSpec, doc.getNumberOfPages());
      return extractBytes(doc, pages);
    }
  }

  public static byte[] deletePages(File file, String pagesSpec) throws IOException {
    try (PDDocument doc = load(file)) {
      int total = doc.getNumberOfPages();
      List<Integer> toDelete = PageSpec.parse(pagesSpec, total);
      if (toDelete.size() >= total) {
        throw new IllegalArgumentException("Cannot delete every page of the document.");
      }
      // Remove from the end so earlier indexes stay valid.
      toDelete.sort((a, b) -> b - a);
      for (int pageNum : toDelete) doc.removePage(pageNum - 1);
      try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
        doc.save(out);
        return out.toByteArray();
      }
    }
  }

  // --- helpers -----------------------------------------------------------

  /** Copy the given 1-based pages into a new PDF and return its bytes. */
  private static byte[] extractBytes(PDDocument source, List<Integer> pages) throws IOException {
    try (PDDocument out = new PDDocument();
         ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
      for (int pageNum : pages) {
        out.importPage(source.getPage(pageNum - 1));
      }
      out.save(bytes);
      return bytes.toByteArray();
    }
  }

  /** Load a PDF, with a friendly error for corrupt / non-PDF / encrypted files. */
  private static PDDocument load(File file) throws IOException {
    try {
      return Loader.loadPDF(file);
    } catch (IOException e) {
      throw new IOException("Could not read this file as a PDF (it may be corrupt or password-protected).", e);
    }
  }

  private static int parseEvery(String every) {
    if (every == null || every.isBlank()) return 1;
    try {
      int n = Integer.parseInt(every.trim());
      if (n < 1) throw new IllegalArgumentException("every must be at least 1.");
      return n;
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("every must be a number, got \"" + every + "\".");
    }
  }

  /** Kept for reference: PDFBox's Splitter splits at document level. */
  @SuppressWarnings("unused")
  private static List<PDDocument> splitWithSplitter(PDDocument doc, int every) throws IOException {
    Splitter splitter = new Splitter();
    splitter.setSplitAtPage(every);
    return splitter.split(doc);
  }
}
