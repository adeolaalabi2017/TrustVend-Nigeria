/**
 * TrustVend Nigeria — shared Convex helpers.
 *
 * Things every Convex function in this project needs:
 *   - auth lookups (current user, role gates, owner checks)
 *   - slug generation
 *   - rating recompute (transactional)
 *   - notifications
 *   - audit logging
 *   - booking state machine
 *   - rate limiting (in-memory; same as the old src/lib/rate-limit.ts)
 *
 * Naming: anything starting with `_` is a private module helper, not exported
 * from `api`. Anything exported here is part of the internal Convex API.
 */

import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

type UserId = Id<"users">;
type VendorId = Id<"vendors">;
type ThreadId = Id<"threads">;


// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Fetch a user by id. Does not check `banned` — use `requireUser` for that.
 */
export async function getUser(
  ctx: QueryCtx | MutationCtx,
  userId: string
): Promise<Doc<"users"> | null> {
  return (await ctx.db.get(userId as Id<"users">)) as Doc<"users"> | null;
}

// ---------------------------------------------------------------------------
// Typed doc getters — ctx.db.get(string) returns a union of all 12 doc
// types, which breaks property access. These helpers cast to the right
// table type.
// ---------------------------------------------------------------------------

export const getUserDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"users"> | null> =>
  ctx.db.get(id as Id<"users">) as Promise<Doc<"users"> | null>;

export const getVendorDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"vendors"> | null> =>
  ctx.db.get(id as Id<"vendors">) as Promise<Doc<"vendors"> | null>;

export const getReviewDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"reviews"> | null> =>
  ctx.db.get(id as Id<"reviews">) as Promise<Doc<"reviews"> | null>;

export const getBookmarkDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"bookmarks"> | null> =>
  ctx.db.get(id as Id<"bookmarks">) as Promise<Doc<"bookmarks"> | null>;

export const getThreadDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"threads"> | null> =>
  ctx.db.get(id as Id<"threads">) as Promise<Doc<"threads"> | null>;

export const getMessageDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"messages"> | null> =>
  ctx.db.get(id as Id<"messages">) as Promise<Doc<"messages"> | null>;

export const getNotificationDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"notifications"> | null> =>
  ctx.db.get(id as Id<"notifications">) as Promise<Doc<"notifications"> | null>;

export const getBookingDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"bookings"> | null> =>
  ctx.db.get(id as Id<"bookings">) as Promise<Doc<"bookings"> | null>;

export const getPostDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"posts"> | null> =>
  ctx.db.get(id as Id<"posts">) as Promise<Doc<"posts"> | null>;

export const getEventDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"events"> | null> =>
  ctx.db.get(id as Id<"events">) as Promise<Doc<"events"> | null>;

export const getAuditLogDoc = (
  ctx: QueryCtx | MutationCtx,
  id: string
): Promise<Doc<"auditLogs"> | null> =>
  ctx.db.get(id as Id<"auditLogs">) as Promise<Doc<"auditLogs"> | null>;

export async function getUserByEmail(
  ctx: QueryCtx | MutationCtx,
  email: string
): Promise<Doc<"users"> | null> {
  return (await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email.toLowerCase()))
    .unique()) as Doc<"users"> | null;
}

/**
 * Throws ConvexError if the user is missing or banned. Returns the user row.
 *
 * Every authed Convex function should call this as its first line.
 */
export async function requireUser(ctx: QueryCtx | MutationCtx, userId: string) {
  const user = await getUser(ctx, userId);
  if (!user) throw new ConvexError("Not authenticated");
  if (user.banned) throw new ConvexError("Account suspended");
  return user;
}

export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: string
) {
  const user = await requireUser(ctx, userId);
  if (user.role !== "ADMIN") throw new ConvexError("Admin only");
  return user;
}

export async function requireVendorRole(
  ctx: QueryCtx | MutationCtx,
  userId: string
) {
  const user = await requireUser(ctx, userId);
  if (user.role !== "VENDOR" && user.role !== "ADMIN")
    throw new ConvexError("Vendor account required");
  return user;
}

/** Throws if the user does not own the given vendor (admins always pass). */
export async function requireVendorOwner(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  vendorId: string
) {
  const user = await requireUser(ctx, userId);
  if (user.role === "ADMIN") return user;
  const vendor = (await ctx.db.get(vendorId as Id<"vendors">)) as Doc<"vendors"> | null;
  if (!vendor) throw new ConvexError("Vendor not found");
  if (vendor.userId !== user._id)
    throw new ConvexError("Not the owner of this vendor");
  return user;
}

// ---------------------------------------------------------------------------
// Password hashing (PBKDF2 via Web Crypto, Convex-compatible)
//
// Format: pbkdf2$<iterations>$<salt_b64>$<hash_b64>
//
// We avoid bcryptjs because it uses setTimeout internally, which Convex
// disallows in queries/mutations. PBKDF2-SHA-256 with 100k iterations
// gives equivalent cost (~100ms on V8 isolate).
// ---------------------------------------------------------------------------

function bytesToBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  if (typeof btoa !== "undefined") return btoa(s);
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob !== "undefined") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    HASH_BITS
  );
  return new Uint8Array(bits as ArrayBuffer);
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const derived = await pbkdf2(plain, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
    const iterations = Number(parts[1]);
    const salt = base64ToBytes(parts[2]);
    const expected = base64ToBytes(parts[3]);
    const derived = await pbkdf2(plain, salt, iterations);
    if (derived.length !== expected.length) return false;
    // Constant-time comparison
    let diff = 0;
    for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Slugs
// ---------------------------------------------------------------------------

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "item";
}

/**
 * Find a slug for `base` that isn't already used in `table`.
 * Suffixes with `-2`, `-3`, … until free.
 */
export async function uniqueSlug(
  ctx: QueryCtx | MutationCtx,
  table: "vendors" | "posts" | "events",
  base: string
): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 1;
  // Bounded loop — 50 attempts is plenty for a real-world slug space.
  while (n < 50) {
    const existing = await ctx.db
      .query(table)
      .withIndex("by_slug" as any, (q: any) => q.eq("slug", candidate))
      .unique();
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
  // Fallback: append a short random suffix.
  return `${root}-${Math.random().toString(36).slice(2, 6)}`;
}

// ---------------------------------------------------------------------------
// Rating recompute (transactional)
// ---------------------------------------------------------------------------

/**
 * Recompute and persist ratingAvg / ratingCount for a vendor, ignoring hidden
 * reviews. Replaces the Prisma `$transaction` block in
 * `src/lib/vendor-serializer.ts`.
 */
export async function recomputeVendorRating(
  ctx: MutationCtx,
  vendorId: string
) {
  const visible = await ctx.db
    .query("reviews")
    .withIndex("by_vendor", (q) => q.eq("vendorId", vendorId as any))
    .filter((q) => q.eq(q.field("hidden"), false))
    .collect();
  const count = visible.length;
  const avg =
    count === 0
      ? 0
      : Math.round(
          (visible.reduce((s, r) => s + r.rating, 0) / count) * 10
        ) / 10;
  await ctx.db.patch(vendorId as any, {
    ratingAvg: avg,
    ratingCount: count,
    updatedAt: Date.now(),
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES = [
  "NEW_MESSAGE",
  "NEW_ENQUIRY",
  "NEW_REVIEW",
  "VENDOR_APPROVED",
  "VENDOR_REJECTED",
  "VERIFIED",
  "BOOKING_REQUEST",
  "BOOKING_CONFIRMED",
  "BOOKING_DECLINED",
  "BOOKING_CANCELLED",
  "EVENT_REMINDER",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotifyArgs {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Create an in-app notification. Best-effort: failures are swallowed so a
 * notification error never breaks the parent mutation.
 */
export async function notify(ctx: MutationCtx, args: NotifyArgs) {
  try {
    await ctx.db.insert("notifications", {
      userId: args.userId as any,
      type: args.type,
      title: args.title,
      body: args.body,
      link: args.link,
      read: false,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("notify() failed:", err);
  }
}

/** Convenience: notify the owner of a vendor (looks up userId from vendorId). */
export async function notifyVendorOwner(
  ctx: MutationCtx,
  vendorId: string,
  args: Omit<NotifyArgs, "userId">
) {
  const vendor = (await ctx.db.get(vendorId as Id<"vendors">)) as Doc<"vendors"> | null;
  if (!vendor) return;
  await notify(ctx, { ...args, userId: vendor.userId });
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function audit(
  ctx: MutationCtx,
  args: {
    actorId?: string;
    action: string;
    targetId?: string;
    targetType?: string;
    detail?: string;
  }
) {
  try {
    await ctx.db.insert("auditLogs", {
      actorId: args.actorId ? (args.actorId as any) : undefined,
      action: args.action,
      targetId: args.targetId,
      targetType: args.targetType,
      detail: args.detail,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("audit() failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Booking state machine
// ---------------------------------------------------------------------------

export const BOOKING_TRANSITIONS: Record<string, ReadonlyArray<string>> = {
  PENDING: ["CONFIRMED", "DECLINED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  DECLINED: [],
  CANCELLED: [],
};

export function canTransitionBooking(from: string, to: string): boolean {
  return (BOOKING_TRANSITIONS[from] ?? []).includes(to);
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory; process-local; OK for single-tenant self-host)
// ---------------------------------------------------------------------------

interface RateLimitBucket {
  hits: number;
  resetAt: number;
}

const RATE_BUCKETS = new Map<string, RateLimitBucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Sliding-window-ish in-memory limiter. Keys are arbitrary (`${ip}:${route}`
 * is a good default). For multi-instance self-hosted, swap this for a
 * Convex table-backed limiter.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = RATE_BUCKETS.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    RATE_BUCKETS.set(key, { hits: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (existing.hits >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.hits += 1;
  return {
    ok: true,
    remaining: limit - existing.hits,
    resetAt: existing.resetAt,
  };
}

// ---------------------------------------------------------------------------
// Pagination helpers
// ---------------------------------------------------------------------------

export const paginationArgs = {
  limit: v.optional(v.number()),
  cursor: v.optional(v.string()),
};

export const PAGE_SIZE_DEFAULT = 24;

// ---------------------------------------------------------------------------
// Arg schema shortcuts (kept here so entity files are tidy)
// ---------------------------------------------------------------------------

export const vendorStatusSchema = v.union(
  v.literal("PENDING"),
  v.literal("APPROVED"),
  v.literal("SUSPENDED"),
  v.literal("REJECTED")
);

export const verificationStageSchema = v.union(
  v.literal("NONE"),
  v.literal("INSTAGRAM_CHECK"),
  v.literal("MANUAL_REVIEW"),
  v.literal("PAYMENT"),
  v.literal("COMPLETED")
);

export const bookingStatusSchema = v.union(
  v.literal("PENDING"),
  v.literal("CONFIRMED"),
  v.literal("DECLINED"),
  v.literal("CANCELLED")
);
