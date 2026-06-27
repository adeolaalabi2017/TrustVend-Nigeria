import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { requireSameOrigin } from "./request-guard";

describe("requireSameOrigin", () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("allows GET requests without origin check", () => {
    const req = new NextRequest("https://example.com/api/test", {
      method: "GET",
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull(); // null = allowed
  });

  it("allows HEAD requests without origin check", () => {
    const req = new NextRequest("https://example.com/api/test", {
      method: "HEAD",
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull();
  });

  it("allows OPTIONS requests without origin check", () => {
    const req = new NextRequest("https://example.com/api/test", {
      method: "OPTIONS",
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull();
  });

  it("allows POST with matching origin in production", () => {
    process.env.NODE_ENV = "production";
    const req = new NextRequest("https://example.com/api/test", {
      method: "POST",
      headers: { origin: "https://example.com" },
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull();
  });

  it("rejects POST with non-matching origin in production", () => {
    process.env.NODE_ENV = "production";
    const req = new NextRequest("https://example.com/api/test", {
      method: "POST",
      headers: { origin: "https://evil.com" },
    });
    const result = requireSameOrigin(req);
    expect(result).not.toBeNull(); // non-null = blocked
    expect(result!.status).toBe(403);
  });

  it("allows POST without origin in development", () => {
    process.env.NODE_ENV = "development";
    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull();
  });

  it("allows POST with localhost origin in development", () => {
    process.env.NODE_ENV = "development";
    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull();
  });

  it("rejects POST without origin in production", () => {
    process.env.NODE_ENV = "production";
    const req = new NextRequest("https://example.com/api/test", {
      method: "POST",
    });
    const result = requireSameOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
