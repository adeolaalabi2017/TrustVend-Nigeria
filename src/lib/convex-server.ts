/**
 * Server-side Convex client + auth helpers.
 *
 * Every /api/* route in this project should use these helpers instead of
 * touching Prisma directly. ConvexHttpClient makes regular HTTP POSTs to the
 * self-hosted backend (the same URL the browser uses); queries and mutations
 * are routed by their `function` name and arg shape.
 */

import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { api as generatedApi } from "../../convex/_generated/api";

/**
 * Re-export the generated `api` object. Using this indirection lets us
 * (a) keep the relative path in one place, and
 * (b) swap the client (e.g. for a mock) in tests.
 */
export const api = generatedApi;

/** Lazy singleton — a single ConvexHttpClient per process. */
let _client: ConvexHttpClient | null = null;
export function convexServer(): ConvexHttpClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set. Add it to .env.local."
    );
  }
  _client = new ConvexHttpClient(url);
  return _client;
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: "CUSTOMER" | "VENDOR" | "ADMIN";
};

/** Returns the Convex user id from the NextAuth session, or null. */
export async function getUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as SessionUser | undefined)?.id ?? null;
}

/** Same as getUserId but throws if not signed in. */
export async function requireUserId(): Promise<string> {
  const id = await getUserId();
  if (!id) throw new ConvexRouteError("Not authenticated", 401);
  return id;
}

/** Returns the full session user, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as SessionUser | undefined) ?? null;
}

/** Throws if the caller is not an admin. */
export async function requireAdminUserId(): Promise<string> {
  const u = await getSessionUser();
  if (!u) throw new ConvexRouteError("Not authenticated", 401);
  if (u.role !== "ADMIN") throw new ConvexRouteError("Admin only", 403);
  return u.id;
}

// ---------------------------------------------------------------------------
// Typed wrapper around ConvexHttpClient.query / .mutation
// ---------------------------------------------------------------------------

export class ConvexRouteError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Typed query wrapper. Throws ConvexRouteError on failure. */
export async function convexQuery<Fn extends FunctionReference<"query">>(
  fn: Fn,
  args: FunctionArgs<Fn>
): Promise<FunctionReturnType<Fn>> {
  try {
    return await convexServer().query(fn, args);
  } catch (err) {
    throw wrapConvexError(err);
  }
}

/** Typed mutation wrapper. Throws ConvexRouteError on failure. */
export async function convexMutate<Fn extends FunctionReference<"mutation">>(
  fn: Fn,
  args: FunctionArgs<Fn>
): Promise<FunctionReturnType<Fn>> {
  try {
    return await convexServer().mutation(fn, args);
  } catch (err) {
    throw wrapConvexError(err);
  }
}

function wrapConvexError(err: unknown): ConvexRouteError {
  const message = err instanceof Error ? err.message : "Convex error";
  // Convex uses ConvexError with .data; plain Error for unhandled.
  const status = /unauthor|auth|admin|forbid|ban/i.test(message) ? 403 : 400;
  return new ConvexRouteError(message, status);
}
