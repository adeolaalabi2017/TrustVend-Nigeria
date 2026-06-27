import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const IMG_SRC_ALLOWED = [
  "'self'",
  "data:",
  "blob:",
  "https://instagram.com",
  "https://cdninstagram.com",
  "https://fbcdn.net",
];

/**
 * Security headers middleware.
 *
 * - HSTS: force HTTPS in production (the Caddy gateway terminates TLS).
 * - X-Content-Type-Options: prevent MIME sniffing.
 * - X-Frame-Options: prevent clickjacking (deny framing).
 * - Referrer-Policy: limit referrer leakage.
 * - Permissions-Policy: lock down browser APIs.
 * - CSP: Content Security Policy (unsafe-inline needed for Next.js hydration).
 */
export function middleware(_req: NextRequest) {
  const res = NextResponse.next();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${IMG_SRC_ALLOWED.join(" ")}`,
    `connect-src 'self'${
      isProd
        ? ""
        : " ws: wss: http: https:"
    } http://trust-vend-convex-d1fd76-185-209-223-95.sslip.io http://trust-vend-convex-2e9a38-185-209-223-95.sslip.io ws://trust-vend-convex-d1fd76-185-209-223-95.sslip.io ws://trust-vend-convex-2e9a38-185-209-223-95.sslip.io`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");

  res.headers.set("Content-Security-Policy", csp);

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|vendors|uploads).*)"],
};
