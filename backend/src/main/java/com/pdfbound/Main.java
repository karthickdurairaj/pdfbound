package com.pdfbound;

import io.vertx.core.Vertx;

/** Entry point: starts Vert.x and deploys the HTTP verticle. */
public class Main {
  public static void main(String[] args) {
    Vertx vertx = Vertx.vertx();
    vertx.deployVerticle(new PdfToolsVerticle())
      .onSuccess(id -> System.out.println("PDFBound backend deployed: " + id))
      .onFailure(err -> {
        System.err.println("Failed to deploy PDFBound backend: " + err.getMessage());
        vertx.close();
      });
  }
}
