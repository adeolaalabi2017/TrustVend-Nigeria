import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, getClientIp } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows first request within limit", () => {
    const result = rateLimit({ key: "test:1", limit: 5, windowMs: 60000 });
    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  it("allows requests within limit", () => {
    for (let i = 0; i < 5; i++) {
      const result = rateLimit({ key: "test:2", limit: 5, windowMs: 60000 });
      expect(result.allowed).toBe(true);
    }
  });

  it("rejects requests over limit", () => {
    for (let i = 0; i < 5; i++) {
      rateLimit({ key: "test:3", limit: 5, windowMs: 60000 });
    }
    const result = rateLimit({ key: "test:3", limit: 5, windowMs: 60000 });
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("resets counter after window expiry", () => {
    const opts = { key: "test:4", limit: 2, windowMs: 60000 };
    rateLimit(opts);
    rateLimit(opts);
    const blocked = rateLimit(opts);
    expect(blocked.allowed).toBe(false);

    vi.advanceTimersByTime(60001);

    const reset = rateLimit(opts);
    expect(reset.allowed).toBe(true);
  });

  it("tracks different keys independently", () => {
    rateLimit({ key: "user:a", limit: 1, windowMs: 60000 });
    const aBlocked = rateLimit({ key: "user:a", limit: 1, windowMs: 60000 });
    expect(aBlocked.allowed).toBe(false);

    const bAllowed = rateLimit({ key: "user:b", limit: 1, windowMs: 60000 });
    expect(bAllowed.allowed).toBe(true);
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "192.168.1.1, 10.0.0.1" },
    }) as any;
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it("extracts IP from x-real-ip header", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "192.168.1.2" },
    }) as any;
    expect(getClientIp(req)).toBe("192.168.1.2");
  });

  it("falls back to unknown when no headers", () => {
    const req = new Request("http://localhost") as any;
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "192.168.1.1",
        "x-real-ip": "192.168.1.2",
      },
    }) as any;
    expect(getClientIp(req)).toBe("192.168.1.1");
  });
});
