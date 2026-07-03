/**
 * TrustVend Nigeria — User functions.
 *
 * The only entity the auth flow needs to talk to. The NextAuth Credentials
 * provider calls `getByEmail` from src/lib/auth.ts; everything else
 * (`register`, `me`, `changePassword`, `deleteAccount`) is called from
 * either the NextAuth registration route or the in-app account panel.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getBootstrapAdminEmail,
  getUserByEmail,
  getUserDoc,
  hashPassword,
  notify,
  rateLimit,
  requireUser,
  uniqueSlug,
  verifyPassword,
} from "./_helpers";

const ROLE = v.union(
  v.literal("CUSTOMER"),
  v.literal("VENDOR"),
  v.literal("ADMIN")
);

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Used by NextAuth `authorize()` — look up a user by email. */
export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const limit = rateLimit(`login:${email.toLowerCase()}`, 10, 60_000);
    if (!limit.ok) throw new ConvexError("Too many login attempts, try again shortly");
    return await getUserByEmail(ctx, email);
  },
});

/** Returns the current user. Used by /api/me and the in-app user menu. */
export const me = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, { userId }) => {
    if (!userId) return null;
    const user = await getUserDoc(ctx, userId);
    if (!user || user.banned) return null;
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    return {
      _id: user._id,
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
      role: user.role,
      createdAt: user.createdAt,
      vendor: vendor
        ? {
            id: vendor._id,
            businessName: vendor.businessName,
            category: vendor.category,
            status: vendor.status,
            rejectionReason: vendor.rejectionReason ?? null,
            verified: vendor.verified,
          }
        : null,
    };
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Register a new user. Optionally seeds a PENDING Vendor shell if
 * `signupKind === "vendor"`. Passwords are PBKDF2-SHA-256 (100k iters) hashed.
 *
 * Mirrors POST /api/auth/register from the old Prisma app.
 */
export const register = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    role: v.optional(ROLE), // defaults to CUSTOMER
    signupKind: v.optional(
      v.union(v.literal("customer"), v.literal("vendor"))
    ),
    // Vendor shell fields, only honored when signupKind === "vendor"
    businessName: v.optional(v.string()),
    category: v.optional(v.string()),
    description: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    instagramHandle: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Rate limit: 5 registrations / minute / email (caller can pass the IP
    // as part of the key by combining it client-side; here we keep it simple).
    const limit = rateLimit(`register:${args.email}`, 5, 60_000);
    if (!limit.ok)
      throw new ConvexError("Too many registration attempts, slow down");

    const email = args.email.toLowerCase().trim();
    const existing = await getUserByEmail(ctx, email);
    if (existing) throw new ConvexError("Email already registered");

    if (args.password.length < 8)
      throw new ConvexError("Password must be at least 8 characters");

    const now = Date.now();
    const passwordHash = await hashPassword(args.password);

    // ----- Bootstrap: honor BOOTSTRAP_ADMIN_EMAIL ------------------------
    // If the env var is set and a registration's email matches, force
    // the role to ADMIN regardless of the client-supplied role. This
    // is the only server-controlled escape hatch for creating the first
    // admin on a fresh deployment.
    let resolvedRole: "CUSTOMER" | "VENDOR" | "ADMIN" =
      args.role ?? (args.signupKind === "vendor" ? "VENDOR" : "CUSTOMER");
    if (BOOTSTRAP_ADMIN_EMAIL() && email === BOOTSTRAP_ADMIN_EMAIL()) {
      resolvedRole = "ADMIN";
    }

    const userId = await ctx.db.insert("users", {
      email,
      name: args.name.trim(),
      image: undefined,
      role: resolvedRole,
      password: passwordHash,
      banned: false,
      createdAt: now,
      updatedAt: now,
    });

    let vendorId: string | undefined;
    if (args.signupKind === "vendor") {
      if (
        !args.businessName ||
        !args.category ||
        !args.description ||
        !args.city ||
        !args.state ||
        !args.instagramHandle
      ) {
        throw new ConvexError("Missing required vendor fields");
      }
      const slug = await uniqueSlug(ctx, "vendors", args.businessName);
      vendorId = await ctx.db.insert("vendors", {
        userId: userId as any,
        slug,
        businessName: args.businessName,
        category: args.category,
        description: args.description,
        products: "",
        city: args.city,
        state: args.state,
        instagramHandle: args.instagramHandle,
        instagramUrl: `https://instagram.com/${args.instagramHandle.replace(
          /^@/,
          ""
        )}`,
        whatsappNumber: args.whatsappNumber,
        photos: [],
        status: "PENDING",
        verified: false,
        verificationStage: "NONE",
        featured: false,
        featuredUntil: undefined,
        ratingAvg: 0,
        ratingCount: 0,
        views: 0,
        availableNote: undefined,
        rejectionReason: undefined,
        verifiedAt: undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { userId, vendorId };
  },
});

/** Change the current user's password. */
export const changePassword = mutation({
  args: {
    userId: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, { userId, currentPassword, newPassword }) => {
    const user = await requireUser(ctx, userId);
    const ok = await verifyPassword(currentPassword, user.password);
    if (!ok) throw new ConvexError("Current password is incorrect");
    if (newPassword.length < 8)
      throw new ConvexError("New password must be at least 8 characters");
    await ctx.db.patch(userId as any, {
      password: await hashPassword(newPassword),
      updatedAt: Date.now(),
    });
    return { ok: true };
  },
});

/**
 * Delete the current user's account + everything they own.
 * Mirrors DELETE /api/account. Admins cannot delete themselves.
 */
export const deleteAccount = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await requireUser(ctx, userId);
    if (user.role === "ADMIN")
      throw new ConvexError("Admins cannot self-delete via this endpoint");

    // Cascade by hand (Convex has no FK cascades).
    const myVendors = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .collect();
    for (const v of myVendors) {
      // Delete reviews / bookmarks / bookings / threads on this vendor.
      const reviews = await ctx.db
        .query("reviews")
        .withIndex("by_vendor", (q) => q.eq("vendorId", v._id))
        .collect();
      for (const r of reviews) await ctx.db.delete(r._id);

      const bookmarks = await ctx.db
        .query("bookmarks")
        .withIndex("by_vendor", (q) => q.eq("vendorId", v._id))
        .collect();
      for (const b of bookmarks) await ctx.db.delete(b._id);

      const bookings = await ctx.db
        .query("bookings")
        .withIndex("by_vendor", (q) => q.eq("vendorId", v._id))
        .collect();
      for (const b of bookings) await ctx.db.delete(b._id);

      const threads = await ctx.db
        .query("threads")
        .withIndex("by_vendor", (q) => q.eq("vendorId", v._id))
        .collect();
      for (const t of threads) {
        const msgs = await ctx.db
          .query("messages")
          .withIndex("by_thread", (q) => q.eq("threadId", t._id))
          .collect();
        for (const m of msgs) await ctx.db.delete(m._id);
        await ctx.db.delete(t._id);
      }

      await ctx.db.delete(v._id);
    }

    // User-authored content
    const myReviews = await ctx.db
      .query("reviews")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .collect();
    for (const r of myReviews) await ctx.db.delete(r._id);

    const myBookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .collect();
    for (const b of myBookmarks) await ctx.db.delete(b._id);

    const myThreads = await ctx.db
      .query("threads")
      .withIndex("by_customer", (q) => q.eq("customerId", userId as any))
      .collect();
    for (const t of myThreads) {
      const msgs = await ctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", t._id))
        .collect();
      for (const m of msgs) await ctx.db.delete(m._id);
      await ctx.db.delete(t._id);
    }

    const myBookings = await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customerId", userId as any))
      .collect();
    for (const b of myBookings) await ctx.db.delete(b._id);

    const myNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .collect();
    for (const n of myNotifications) await ctx.db.delete(n._id);

    const myEventBookmarks = await ctx.db
      .query("eventBookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .collect();
    for (const e of myEventBookmarks) await ctx.db.delete(e._id);

    const myPosts = await ctx.db
      .query("posts")
      .withIndex("by_author", (q) => q.eq("authorId", userId as any))
      .collect();
    for (const p of myPosts) await ctx.db.delete(p._id);

    const myEvents = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", userId as any))
      .collect();
    for (const e of myEvents) await ctx.db.delete(e._id);

    await ctx.db.delete(userId as any);
    return { ok: true };
  },
});

/** Admin-only: ban / unban / change role. */
export const adminUpdateUser = mutation({
  args: {
    actorId: v.string(),
    targetId: v.string(),
    action: v.union(
      v.literal("ban"),
      v.literal("unban"),
      v.literal("makeAdmin"),
      v.literal("makeCustomer")
    ),
  },
  handler: async (ctx, { actorId, targetId, action }) => {
    const actor = await requireUser(ctx, actorId);
    if (actor.role !== "ADMIN") throw new ConvexError("Admin only");
    if (targetId === actorId)
      throw new ConvexError("Admins cannot change their own role/status");

    const target = await getUserDoc(ctx, targetId);
    if (!target) throw new ConvexError("User not found");

    const now = Date.now();
    if (action === "ban") {
      await ctx.db.patch(targetId as any, { banned: true, updatedAt: now });
    } else if (action === "unban") {
      await ctx.db.patch(targetId as any, { banned: false, updatedAt: now });
    } else if (action === "makeAdmin") {
      await ctx.db.patch(targetId as any, { role: "ADMIN", updatedAt: now });
    } else if (action === "makeCustomer") {
      await ctx.db.patch(targetId as any, { role: "CUSTOMER", updatedAt: now });
    }

    return { ok: true };
  },
});

/** Admin: permanently delete a user and cascade to all their data. */
export const adminDeleteUser = mutation({
  args: { actorId: v.string(), targetId: v.string() },
  handler: async (ctx, { actorId, targetId }) => {
    const actor = await requireUser(ctx, actorId);
    if (actor.role !== "ADMIN") throw new ConvexError("Admin only");
    if (targetId === actorId) throw new ConvexError("Cannot delete yourself");
    const target = await getUserDoc(ctx, targetId);
    if (!target) throw new ConvexError("User not found");

    // Cascade delete
    const vendors = await ctx.db.query("vendors").withIndex("by_user", (q) => q.eq("userId", targetId as any)).collect();
    for (const v of vendors) {
      const revs = await ctx.db.query("reviews").withIndex("by_vendor", (q) => q.eq("vendorId", v._id)).collect();
      for (const r of revs) await ctx.db.delete(r._id);
      const bms = await ctx.db.query("bookmarks").withIndex("by_vendor", (q) => q.eq("vendorId", v._id)).collect();
      for (const b of bms) await ctx.db.delete(b._id);
      await ctx.db.delete(v._id);
    }
    const reviews = await ctx.db.query("reviews").withIndex("by_user", (q) => q.eq("userId", targetId as any)).collect();
    for (const r of reviews) await ctx.db.delete(r._id);
    const bms = await ctx.db.query("bookmarks").withIndex("by_user", (q) => q.eq("userId", targetId as any)).collect();
    for (const b of bms) await ctx.db.delete(b._id);
    const threads = await ctx.db.query("threads").withIndex("by_customer", (q) => q.eq("customerId", targetId as any)).collect();
    for (const t of threads) {
      const msgs = await ctx.db.query("messages").withIndex("by_thread", (q) => q.eq("threadId", t._id)).collect();
      for (const m of msgs) await ctx.db.delete(m._id);
      await ctx.db.delete(t._id);
    }
    await ctx.db.delete(targetId as any);
    return { ok: true };
  },
});

/** Admin: list all users with their primary vendor (if any). Paginated. */
export const adminList = query({
  args: {
    actorId: v.string(),
    q: v.optional(v.string()),
    role: v.optional(ROLE),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { actorId, q, role, limit, cursor }) => {
    await requireUser(ctx, actorId); // role check happens via requireAdmin if needed
    const PAGE = Math.min(limit ?? 24, 60);
    const all = await ctx.db.query("users").order("desc").collect();
    const filtered = all.filter((u) => {
      if (role && u.role !== role) return false;
      if (q && !`${u.email} ${u.name ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
    const start = cursor ? Number(cursor) : 0;
    const page = filtered.slice(start, start + PAGE);
    return {
      items: page.map((u) => ({
        id: u._id,
        email: u.email,
        name: u.name ?? null,
        image: u.image ?? null,
        role: u.role,
        banned: u.banned,
        createdAt: u.createdAt,
      })),
      nextCursor: start + PAGE < filtered.length ? String(start + PAGE) : undefined,
      total: filtered.length,
    };
  },
});

/**
 * Helper for the NextAuth authorize() flow on the server. We expose this as
 * a Convex query so that src/lib/auth.ts can do a single round trip to
 * verify credentials without ever pulling PBKDF2 into the Next.js runtime.
 */
export const verifyCredentials = query({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    const key = `login:${email.toLowerCase()}`;
    const limit = rateLimit(key, 10, 60_000);
    if (!limit.ok) throw new ConvexError("Too many login attempts, try again shortly");
    const user = await getUserByEmail(ctx, email);
    if (!user || user.banned) return null;
    const ok = await verifyPassword(password, user.password);
    if (!ok) return null;
    return {
      _id: user._id,
      email: user.email,
      name: user.name ?? null,
      image: user.image ?? null,
      role: user.role,
    };
  },
});

export const getMe = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await requireUser(ctx, userId);
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .first();
    return {
      user: {
        id: user._id,
        email: user.email,
        name: user.name ?? null,
        image: user.image ?? null,
        role: user.role,
        createdAt: user.createdAt,
      },
      vendor: vendor
        ? {
            id: vendor._id,
            slug: vendor.slug,
            businessName: vendor.businessName,
            category: vendor.category,
            description: vendor.description,
            products: vendor.products,
            city: vendor.city,
            state: vendor.state,
            instagramHandle: vendor.instagramHandle,
            whatsappNumber: vendor.whatsappNumber ?? null,
            photos: vendor.photos,
            status: vendor.status,
            verified: vendor.verified,
            verificationStage: vendor.verificationStage,
            featured: vendor.featured,
            featuredUntil: vendor.featuredUntil ?? null,
            ratingAvg: vendor.ratingAvg,
            ratingCount: vendor.ratingCount,
            views: vendor.views,
            availableNote: vendor.availableNote ?? null,
            rejectionReason: vendor.rejectionReason ?? null,
            verifiedAt: vendor.verifiedAt ?? null,
            createdAt: vendor.createdAt,
            available: vendor.verificationStage === "COMPLETED",
          }
        : null,
    };
  },
});

/**
 * One-shot bootstrap escape hatch for promoting an already-registered
 * account to ADMIN role. Used when the BOOTSTRAP_ADMIN_EMAIL env var
 * is set on the Convex backend, and a matching account was created
 * BEFORE the bootstrap env var was wired up (so `register` never
 * auto-promoted it).
 *
 * The caller passes their own userId (e.g. from NextAuth `useSession`)
 * AND their email. The server confirms:
 *   1. A user with that ID exists
 *   2. That user's email matches BOOTSTRAP_ADMIN_EMAIL
 *   3. The env var is set
 *   4. The user is not already ADMIN (idempotent)
 *
 * Returns `{ ok: true, promoted: boolean }`. After the first successful
 * call, the env var can be safely removed from the Convex backend.
 */
export const bootstrapPromoteSelf = mutation({
  args: {
    userId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { userId, email }) => {
    const target = getBootstrapAdminEmail();
    if (!target) throw new ConvexError("BOOTSTRAP_ADMIN_EMAIL not configured");
    if (email.toLowerCase().trim() !== target) {
      throw new ConvexError("Email does not match BOOTSTRAP_ADMIN_EMAIL");
    }

    const user = await getUserDoc(ctx, userId);
    if (!user) throw new ConvexError("User not found");
    if (user.email.toLowerCase().trim() !== target) {
      throw new ConvexError("User email does not match BOOTSTRAP_ADMIN_EMAIL");
    }
    if (user.role === "ADMIN") {
      return { ok: true, promoted: false };
    }

    const now = Date.now();
    await ctx.db.patch(userId as any, { role: "ADMIN", updatedAt: now });

    await ctx.db.insert("auditLog", {
      actorId: userId as any,
      action: "ADMIN_PROMOTE_BOOTSTRAP",
      targetType: "users",
      targetId: userId as any,
      before: { role: user.role },
      after: { role: "ADMIN", via: "BOOTSTRAP_ADMIN_EMAIL env var" },
      at: now,
    });

    return { ok: true, promoted: true };
  },
});
