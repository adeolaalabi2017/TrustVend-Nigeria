import { NextRequest, NextResponse } from "next/server";

/**
 * Request-sourcing guard for mutation routes (POST/PATCH/DELETE).
 *
 * NextAuth's built-in CSRF only covers /api/auth/*. This guard protects the
 * app's own API routes from cross-site request forgery by checking the Origin
 * (or fallback Referer) header against the expected host. Browsers always send
 * Origin on cross-origin requests; same-origin requests match automatically.
 *
 * Returns null if the request is allowed, or a 403 NextResponse if rejected.
 */
export function requireSameOrigin(req: Request | NextRequest): NextResponse | null {
  const method = req.method.toUpperCase();
  // Only mutation methods need CSRF protection.
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return null;
  }

  // Allow in local development when no Origin is present (curl/Postman).
  const isDev = process.env.NODE_ENV !== "production";

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Determine the expected origin host(s).
  const appUrl = process.env.NEXTAUTH_URL || `https://${req.headers.get("host") || ""}`;
  let expectedHost: string;
  try {
    expectedHost = new URL(appUrl).host;
  } catch {
    expectedHost = req.headers.get("host") || "";
  }

  // No Origin AND no Referer → treat as non-browser (or stripped). In dev we
  // allow it; in prod we reject to be safe.
  if (!origin && !referer) {
    if (isDev) return null;
    return NextResponse.json(
      { error: "Missing request origin." },
      { status: 403 }
    );
  }

  const source = origin || (referer ? new URL(referer).origin : "");
  let sourceHost = "";
  try {
    sourceHost = new URL(source).host;
  } catch {
    sourceHost = "";
  }

  if (sourceHost && sourceHost === expectedHost) {
    return null;
  }

  // In dev, allow localhost variants (e.g. 127.0.0.1 vs localhost).
  if (isDev && (sourceHost.includes("localhost") || sourceHost.includes("127.0.0.1"))) {
    return null;
  }

  return NextResponse.json(
    { error: "Request origin not allowed." },
    { status: 403 }
  );
}

/**
 * Parse a JSON request body with a size cap to prevent oversized payloads.
 * Returns { data, error } — if error is set, send it as the response.
 */
export async function parseJsonBody(
  req: Request,
  maxBytes = 256 * 1024 // 256KB default
): Promise<{ data: any; error: NextResponse | null }> {
  try {
    const text = await req.text();
    if (text.length > maxBytes) {
      return {
        data: null,
        error: NextResponse.json(
          { error: "Request body too large." },
          { status: 413 }
        ),
      };
    }
    if (!text) return { data: {}, error: null };
    return { data: JSON.parse(text), error: null };
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      ),
    };
  }
}
