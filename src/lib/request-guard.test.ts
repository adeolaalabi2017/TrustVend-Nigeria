import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { requireSameOrigin } from "./request-guard";

describe("requireSameOrigin", () => {
  // Use a write-through env-var wrapper; process.env.NODE_ENV is typed
  // readonly, and tests need to set it without fighting the type system.
  const setEnv = (k: "NODE_ENV" | "NEXTAUTH_URL", v: string | undefined) => {
    (process.env as Record<string, string | undefined>)[k] = v;
  };
  let originalNodeEnv: string | undefined;
  let originalNextAuthUrl: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    originalNextAuthUrl = process.env.NEXTAUTH_URL;
  });

  afterEach(() => {
    setEnv("NODE_ENV", originalNodeEnv);
    setEnv("NEXTAUTH_URL", originalNextAuthUrl);
  });

  it("allows GET requests without origin check", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXTAUTH_URL", "https://example.com");
    const req = new NextRequest("https://example.com/api/test", {
      method: "GET",
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull(); // null = allowed
  });

  it("allows HEAD requests without origin check", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXTAUTH_URL", "https://example.com");
    const req = new NextRequest("https://example.com/api/test", {
      method: "HEAD",
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull();
  });

  it("allows OPTIONS requests without origin check", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXTAUTH_URL", "https://example.com");
    const req = new NextRequest("https://example.com/api/test", {
      method: "OPTIONS",
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull();
  });

  it("allows POST with matching origin in production", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXTAUTH_URL", "https://example.com");
    const req = new NextRequest("https://example.com/api/test", {
      method: "POST",
      headers: { origin: "https://example.com" },
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull();
  });

  it("rejects POST with non-matching origin in production", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXTAUTH_URL", "https://example.com");
    const req = new NextRequest("https://example.com/api/test", {
      method: "POST",
      headers: { origin: "https://evil.com" },
    });
    const result = requireSameOrigin(req);
    expect(result).not.toBeNull(); // non-null = blocked
    expect(result!.status).toBe(403);
  });

  it("allows POST without origin in development", () => {
    setEnv("NODE_ENV", "development");
    setEnv("NEXTAUTH_URL", "http://localhost:3000");
    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull();
  });

  it("allows POST with localhost origin in development", () => {
    setEnv("NODE_ENV", "development");
    setEnv("NEXTAUTH_URL", "http://localhost:3000");
    const req = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    const result = requireSameOrigin(req);
    expect(result).toBeNull();
  });

  it("rejects POST without origin in production", () => {
    setEnv("NODE_ENV", "production");
    setEnv("NEXTAUTH_URL", "https://example.com");
    const req = new NextRequest("https://example.com/api/test", {
      method: "POST",
    });
    const result = requireSameOrigin(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });
});
