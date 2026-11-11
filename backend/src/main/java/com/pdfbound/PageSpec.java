package com.pdfbound;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Parses 1-based page specs used by the rotate / extract / delete endpoints:
 * "all", "1", "1,3-5", "1-3, 4-6". Ranges are inclusive; results are
 * de-duplicated (preserving order) for single-page lists, and expanded
 * in order for ranges.
 */
public final class PageSpec {

  private PageSpec() {}

  /** Parse "all" or a comma/range spec into 1-based page numbers. */
  public static List<Integer> parse(String spec, int totalPages) {
    if (spec == null || spec.isBlank()) {
      throw new IllegalArgumentException("Missing pages parameter (e.g. \"1,3-5\" or \"all\").");
    }
    String s = spec.trim().toLowerCase();
    if (s.equals("all")) {
      List<Integer> all = new ArrayList<>();
      for (int i = 1; i <= totalPages; i++) all.add(i);
      return all;
    }
    Set<Integer> pages = new LinkedHashSet<>();
    for (String part : s.split(",")) {
      String p = part.trim();
      if (p.isEmpty()) continue;
      if (p.contains("-")) {
        String[] bounds = p.split("-", 2);
        int start = parseInt(bounds[0], spec);
        int end = parseInt(bounds[1], spec);
        if (start < 1 || end < start) {
          throw new IllegalArgumentException("Invalid page range: \"" + p + "\".");
        }
        for (int i = start; i <= end; i++) pages.add(i);
      } else {
        pages.add(parseInt(p, spec));
      }
    }
    if (pages.isEmpty()) {
      throw new IllegalArgumentException("Invalid pages parameter: \"" + spec + "\".");
    }
    for (int page : pages) {
      if (page < 1 || page > totalPages) {
        throw new IllegalArgumentException(
          "Page " + page + " is out of range (document has " + totalPages + " pages).");
      }
    }
    return new ArrayList<>(pages);
  }

  /** Parse split ranges "1-3,4-6" into [start,end] pairs (1-based, inclusive). */
  public static List<int[]> parseRanges(String ranges, int totalPages) {
    if (ranges == null || ranges.isBlank()) {
      throw new IllegalArgumentException("Missing ranges parameter (e.g. \"1-3,4-6\").");
    }
    List<int[]> out = new ArrayList<>();
    for (String part : ranges.split(",")) {
      String p = part.trim();
      if (p.isEmpty()) continue;
      if (!p.contains("-")) {
        int page = parseInt(p, ranges);
        out.add(new int[]{page, page});
      } else {
        String[] bounds = p.split("-", 2);
        out.add(new int[]{parseInt(bounds[0], ranges), parseInt(bounds[1], ranges)});
      }
    }
    if (out.isEmpty()) {
      throw new IllegalArgumentException("Invalid ranges parameter: \"" + ranges + "\".");
    }
    for (int[] r : out) {
      if (r[0] < 1 || r[1] < r[0] || r[1] > totalPages) {
        throw new IllegalArgumentException(
          "Range " + r[0] + "-" + r[1] + " is out of range (document has " + totalPages + " pages).");
      }
    }
    return out;
  }

  private static int parseInt(String value, String spec) {
    try {
      return Integer.parseInt(value.trim());
    } catch (NumberFormatException e) {
      throw new IllegalArgumentException("Invalid page number in \"" + spec + "\": \"" + value + "\".");
    }
  }
}
