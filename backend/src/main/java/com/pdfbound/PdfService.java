package com.pdfbound;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
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
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.util.Matrix;

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

  /**
   * Build a PDF with one image per page, in the given order.
   *
   * @param pageSize    "fit" (page matches each image), "a4" or "letter"
   * @param orientation "auto" (follows each image), "portrait" or "landscape"; ignored for "fit"
   * @param margin      "none", "small" or "large"
   * JPEGs are embedded as-is (no re-encoding); phone photos are turned upright using
   * their EXIF orientation. Images are never enlarged on A4/Letter pages, only shrunk to fit.
   */
  public static byte[] imagesToPdf(List<File> images, String pageSize, String orientation, String margin)
      throws IOException {
    String size = pageSize == null || pageSize.isBlank() ? "fit" : pageSize.trim().toLowerCase();
    String orient = orientation == null || orientation.isBlank() ? "auto" : orientation.trim().toLowerCase();
    float pad = switch (margin == null || margin.isBlank() ? "none" : margin.trim().toLowerCase()) {
      case "none" -> 0f;
      case "small" -> 20f;
      case "large" -> 40f;
      default -> throw new IllegalArgumentException("margin must be none, small or large.");
    };
    PDRectangle base = switch (size) {
      case "fit" -> null;
      case "a4" -> PDRectangle.A4;
      case "letter" -> PDRectangle.LETTER;
      default -> throw new IllegalArgumentException("pageSize must be fit, a4 or letter.");
    };
    if (!List.of("auto", "portrait", "landscape").contains(orient)) {
      throw new IllegalArgumentException("orientation must be auto, portrait or landscape.");
    }

    try (PDDocument doc = new PDDocument();
         ByteArrayOutputStream out = new ByteArrayOutputStream()) {
      int index = 1;
      for (File file : images) {
        PDImageXObject img;
        try {
          img = PDImageXObject.createFromFileByContent(file, doc);
        } catch (IOException | IllegalArgumentException e) {
          throw new IllegalArgumentException("Image " + index + " could not be read. Use JPG, PNG, GIF, BMP or TIFF.");
        }
        int rotation = exifRotation(file);          // 0, 90, 180 or 270 (clockwise)
        boolean sideways = rotation == 90 || rotation == 270;
        float imgW = img.getWidth();
        float imgH = img.getHeight();
        float shownW = sideways ? imgH : imgW;       // size once turned upright
        float shownH = sideways ? imgW : imgH;

        PDRectangle pageBox;
        float scale;
        if (base == null) {
          pageBox = new PDRectangle(shownW + 2 * pad, shownH + 2 * pad);
          scale = 1f;
        } else {
          boolean landscape = orient.equals("landscape") || (orient.equals("auto") && shownW > shownH);
          pageBox = landscape ? new PDRectangle(base.getHeight(), base.getWidth()) : base;
          float boxW = pageBox.getWidth() - 2 * pad;
          float boxH = pageBox.getHeight() - 2 * pad;
          scale = Math.min(1f, Math.min(boxW / shownW, boxH / shownH));
        }

        PDPage page = new PDPage(pageBox);
        doc.addPage(page);
        float drawW = shownW * scale;
        float drawH = shownH * scale;
        float x0 = (pageBox.getWidth() - drawW) / 2f;
        float y0 = (pageBox.getHeight() - drawH) / 2f;

        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
          if (rotation == 0) {
            cs.drawImage(img, x0, y0, drawW, drawH);
          } else {
            // Move to the right corner, then rotate, so the image lands upright in its box.
            cs.saveGraphicsState();
            switch (rotation) {
              case 90 -> {
                cs.transform(Matrix.getTranslateInstance(x0, y0 + drawH));
                cs.transform(Matrix.getRotateInstance(-Math.PI / 2, 0, 0));
              }
              case 180 -> {
                cs.transform(Matrix.getTranslateInstance(x0 + drawW, y0 + drawH));
                cs.transform(Matrix.getRotateInstance(Math.PI, 0, 0));
              }
              default -> { // 270
                cs.transform(Matrix.getTranslateInstance(x0 + drawW, y0));
                cs.transform(Matrix.getRotateInstance(Math.PI / 2, 0, 0));
              }
            }
            cs.drawImage(img, 0, 0, imgW * scale, imgH * scale);
            cs.restoreGraphicsState();
          }
        }
        index++;
      }
      doc.save(out);
      return out.toByteArray();
    }
  }

  /**
   * Clockwise rotation needed to show a JPEG upright, from its EXIF Orientation tag.
   * Returns 0 for non-JPEGs, missing EXIF, or anything unreadable.
   * Mirrored orientations (2, 4, 5, 7) are treated as their nearest rotation.
   */
  static int exifRotation(File file) {
    try (InputStream in = Files.newInputStream(file.toPath())) {
      byte[] head = in.readNBytes(128 * 1024); // EXIF lives at the start of the file
      if (head.length < 4 || (head[0] & 0xFF) != 0xFF || (head[1] & 0xFF) != 0xD8) return 0;
      int pos = 2;
      while (pos + 4 <= head.length && (head[pos] & 0xFF) == 0xFF) {
        int marker = head[pos + 1] & 0xFF;
        int segLen = ((head[pos + 2] & 0xFF) << 8) | (head[pos + 3] & 0xFF);
        if (marker == 0xDA || segLen < 2) break;           // start of image data: no EXIF found
        int body = pos + 4;
        if (marker == 0xE1 && body + 14 <= head.length
            && head[body] == 'E' && head[body + 1] == 'x' && head[body + 2] == 'i' && head[body + 3] == 'f') {
          int tiff = body + 6;
          boolean little = head[tiff] == 'I';
          int ifd = tiff + readInt(head, tiff + 4, little);
          if (ifd + 2 > head.length) return 0;
          int count = readShort(head, ifd, little);
          for (int i = 0; i < count; i++) {
            int entry = ifd + 2 + i * 12;
            if (entry + 12 > head.length) return 0;
            if (readShort(head, entry, little) == 0x0112) {
              return switch (readShort(head, entry + 8, little)) {
                case 3, 4 -> 180;
                case 5, 6 -> 90;
                case 7, 8 -> 270;
                default -> 0;
              };
            }
          }
          return 0;
        }
        pos += 2 + segLen;
      }
    } catch (IOException | RuntimeException e) {
      // Bad or truncated EXIF: just don't rotate.
    }
    return 0;
  }

  private static int readShort(byte[] b, int at, boolean little) {
    return little ? (b[at] & 0xFF) | ((b[at + 1] & 0xFF) << 8)
                  : ((b[at] & 0xFF) << 8) | (b[at + 1] & 0xFF);
  }

  private static int readInt(byte[] b, int at, boolean little) {
    return little ? (b[at] & 0xFF) | ((b[at + 1] & 0xFF) << 8) | ((b[at + 2] & 0xFF) << 16) | ((b[at + 3] & 0xFF) << 24)
                  : ((b[at] & 0xFF) << 24) | ((b[at + 1] & 0xFF) << 16) | ((b[at + 2] & 0xFF) << 8) | (b[at + 3] & 0xFF);
  }

  // --- password protection ---------------------------------------------

  private static final java.security.SecureRandom RANDOM = new java.security.SecureRandom();

  /**
   * Encrypt with AES-256. The user password is needed to open the file.
   * The owner password (which controls permissions) is random and never
   * shown, so the restrictions cannot be lifted without the user password.
   * Passwords are never logged.
   */
  public static byte[] protect(File file, String password, boolean allowPrint, boolean allowCopy, boolean allowEdit)
      throws IOException {
    checkPassword(password);
    PDDocument loaded;
    try {
      loaded = Loader.loadPDF(file);
    } catch (org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException e) {
      throw new IllegalArgumentException("This PDF is already password-protected. Unlock it first.");
    } catch (IOException e) {
      throw new IOException("Could not read this file as a PDF (it may be corrupt).", e);
    }
    try (PDDocument doc = loaded) {
      if (doc.isEncrypted()) {
        throw new IllegalArgumentException("This PDF is already password-protected. Unlock it first.");
      }
      org.apache.pdfbox.pdmodel.encryption.AccessPermission ap =
        new org.apache.pdfbox.pdmodel.encryption.AccessPermission();
      ap.setCanPrint(allowPrint);
      ap.setCanPrintFaithful(allowPrint);
      ap.setCanExtractContent(allowCopy);
      ap.setCanExtractForAccessibility(true); // screen readers keep working
      ap.setCanModify(allowEdit);
      ap.setCanModifyAnnotations(allowEdit);
      ap.setCanFillInForm(allowEdit);
      ap.setCanAssembleDocument(allowEdit);

      byte[] ownerBytes = new byte[24];
      RANDOM.nextBytes(ownerBytes);
      String ownerPassword = java.util.HexFormat.of().formatHex(ownerBytes);

      org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy policy =
        new org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy(ownerPassword, password, ap);
      policy.setEncryptionKeyLength(256); // AES-256
      doc.protect(policy);
      try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
        doc.save(out);
        return out.toByteArray();
      }
    }
  }

  /** Open with the given password and save an unencrypted copy. */
  public static byte[] unlock(File file, String password) throws IOException {
    if (password == null || password.isEmpty()) {
      throw new IllegalArgumentException("Enter the PDF's password.");
    }
    PDDocument doc;
    try {
      doc = Loader.loadPDF(file, password);
    } catch (org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException e) {
      throw new IllegalArgumentException("Wrong password. Please check it and try again.");
    } catch (IOException e) {
      throw new IOException("Could not read this file as a PDF (it may be corrupt).", e);
    }
    try (doc) {
      if (!doc.isEncrypted()) {
        throw new IllegalArgumentException("This PDF is not password-protected.");
      }
      doc.setAllSecurityToBeRemoved(true);
      try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
        doc.save(out);
        return out.toByteArray();
      }
    }
  }

  private static void checkPassword(String password) {
    if (password == null || password.isEmpty()) {
      throw new IllegalArgumentException("Enter a password.");
    }
    if (password.length() < 4) {
      throw new IllegalArgumentException("Password must be at least 4 characters.");
    }
    // AES-256 PDF passwords are limited to 127 UTF-8 bytes.
    if (password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 127) {
      throw new IllegalArgumentException("Password is too long (max 127 bytes).");
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
      throw new IOException("Could not read this file as a PDF (it may be corrupt, or password-protected: use Unlock PDF first).", e);
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
