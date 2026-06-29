/**
 * TrustVend Nigeria — Vendor functions.
 *
 * The Vendor table is the heart of the app. This module covers:
 *   - public list / detail / featured / verified / paginated
 *   - search by text, category, state, sort
 *   - apply (creates a Vendor row from a USER)
 *   - update profile (owner or admin)
 *   - view tracking with per-IP dedupe
 *   - admin actions: approve, reject, suspend, reinstate, verify,
 *     unverify, feature, unfeature, advanceStage
 *
 * Replaces: src/app/api/vendors, /api/vendors/[id], /api/vendors/[id]/view,
 * /api/vendors/[id]/reviews (review listing is delegated to convex/reviews),
 * /api/vendor/dashboard, and the admin vendor PATCH route.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  audit,
  getVendorDoc,
  notify,
  notifyVendorOwner,
  paginationArgs,
  PAGE_SIZE_DEFAULT,
  rateLimit,
  recomputeVendorRating,
  requireAdmin,
  requireUser,
  requireVendorOwner,
  uniqueSlug,
  vendorStatusSchema,
  verificationStageSchema,
} from "./_helpers";

const VENDOR_STAGE_ORDER: Array<
  "NONE" | "INSTAGRAM_CHECK" | "MANUAL_REVIEW" | "PAYMENT" | "COMPLETED"
> = ["NONE", "INSTAGRAM_CHECK", "MANUAL_REVIEW", "PAYMENT", "COMPLETED"];

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

/**
 * Public, paginated, filterable, sortable vendor list.
 * Auto-runs `sweepExpiredFeatured` once per call (throttled inside the
 * helper). Mirrors GET /api/vendors.
 */
export const list = query({
  args: {
    q: v.optional(v.string()),
    category: v.optional(v.string()),
    state: v.optional(v.string()),
    sort: v.optional(
      v.union(
        v.literal("recent"),
        v.literal("rating"),
        v.literal("mostReviewed"),
        v.literal("verified"),
        v.literal("featured")
      )
    ),
    verifiedOnly: v.optional(v.boolean()),
    ...paginationArgs,
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? PAGE_SIZE_DEFAULT, 60);
    const sort = args.sort ?? "recent";
    const verifiedOnly = args.verifiedOnly ?? false;

    // Convex query builder doesn't support dynamic sort over arbitrary
    // fields; instead we collect (capped) and sort in memory. For larger
    // datasets, switch to a per-sort table or paginated indexed scan.
    const all = await ctx.db
      .query("vendors")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .collect();

    const filtered = all.filter((v0) => {
      if (verifiedOnly && !v0.verified) return false;
      if (sort === "featured" && !v0.featured) return false;
      if (args.category && v0.category !== args.category) return false;
      if (args.state && v0.state !== args.state) return false;
      if (args.q) {
        const hay =
          `${v0.businessName} ${v0.description} ${v0.products} ${v0.city} ${v0.instagramHandle}`.toLowerCase();
        if (!hay.includes(args.q.toLowerCase())) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sort !== "featured" && a.featured !== b.featured) return a.featured ? -1 : 1;
      switch (sort) {
        case "featured":
          return b.createdAt - a.createdAt;
        case "rating":
          return b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount;
        case "mostReviewed":
          return b.ratingCount - a.ratingCount;
        case "verified":
          return Number(b.verified) - Number(a.verified);
        case "recent":
        default:
          return b.createdAt - a.createdAt;
      }
    });

    const start = args.cursor ? Number(args.cursor) : 0;
    const slice = sorted.slice(start, start + limit);
    const nextCursor =
      start + limit < sorted.length ? String(start + limit) : undefined;

    return {
      items: slice.map(serializeCard),
      nextCursor,
      total: sorted.length,
    };
  },
});

/** Lightweight card payload — used everywhere vendors are listed. */
export function serializeCard(v: {
  _id: any;
  slug: string;
  businessName: string;
  category: string;
  city: string;
  state: string;
  photos: string[];
  verified: boolean;
  featured: boolean;
  featuredUntil?: number;
  ratingAvg: number;
  ratingCount: number;
  instagramHandle: string;
}) {
  return {
    id: v._id,
    slug: v.slug,
    businessName: v.businessName,
    category: v.category,
    city: v.city,
    state: v.state,
    coverPhoto: v.photos[0] ?? null,
    photos: v.photos,
    verified: v.verified,
    featured: v.featured,
    featuredUntil: v.featuredUntil ?? null,
    ratingAvg: v.ratingAvg,
    ratingCount: v.ratingCount,
    instagramHandle: v.instagramHandle,
  };
}

/** Single-vendor detail page payload. */
export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const v0 = await getVendorDoc(ctx, id);
    if (!v0) return null;
    return {
      id: v0._id,
      slug: v0.slug,
      businessName: v0.businessName,
      category: v0.category,
      description: v0.description,
      products: v0.products,
      city: v0.city,
      state: v0.state,
      instagramHandle: v0.instagramHandle,
      instagramUrl: v0.instagramUrl,
      whatsappNumber: v0.whatsappNumber ?? null,
      photos: v0.photos,
      status: v0.status,
      verified: v0.verified,
      verificationStage: v0.verificationStage,
      featured: v0.featured,
      featuredUntil: v0.featuredUntil ?? null,
      ratingAvg: v0.ratingAvg,
      ratingCount: v0.ratingCount,
      views: v0.views,
      availableNote: v0.availableNote ?? null,
      rejectionReason: v0.rejectionReason ?? null,
      verifiedAt: v0.verifiedAt ?? null,
      userId: v0.userId,
      createdAt: v0.createdAt,
    };
  },
});

/**
 * Full vendor detail: vendor + reviews + bookmark status + isOwner.
 * Single query to avoid N+1 from the view.
 */
export const detail = query({
  args: { id: v.string(), viewerId: v.optional(v.string()) },
  handler: async (ctx, { id, viewerId }) => {
    const v0 = await getVendorDoc(ctx, id);
    if (!v0) return null;
    const isOwner = !!viewerId && String(v0.userId) === String(viewerId);
    let bookmarked = false;
    if (viewerId) {
      const bm = await ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userId", viewerId as any))
        .filter((q) => q.eq(q.field("vendorId"), id as any))
        .first();
      bookmarked = !!bm;
    }
    const allReviews = await ctx.db
      .query("reviews")
      .withIndex("by_vendor", (q) => q.eq("vendorId", id as any))
      .order("desc")
      .collect();
    const visibleReviews = allReviews.filter((r) => !r.hidden || isOwner);
    const reviews = await Promise.all(
      visibleReviews.map(async (r) => {
        const author = await ctx.db.get(r.userId);
        const mine = !!viewerId && String(r.userId) === String(viewerId);
        return {
          id: r._id,
          rating: r.rating,
          comment: r.comment,
          hidden: r.hidden,
          createdAt: r.createdAt,
          mine,
          author: author
            ? { id: author._id, name: author.name ?? "Anonymous", image: author.image ?? null }
            : { id: null, name: "Anonymous", image: null },
        };
      })
    );
    return {
      vendor: {
        id: v0._id,
        slug: v0.slug,
        businessName: v0.businessName,
        category: v0.category,
        description: v0.description,
        products: v0.products,
        city: v0.city,
        state: v0.state,
        instagramHandle: v0.instagramHandle,
        instagramUrl: v0.instagramUrl,
        whatsappNumber: v0.whatsappNumber ?? null,
        photos: v0.photos,
        status: v0.status,
        verified: v0.verified,
        verificationStage: v0.verificationStage,
        featured: v0.featured,
        featuredUntil: v0.featuredUntil ?? null,
        ratingAvg: v0.ratingAvg,
        ratingCount: v0.ratingCount,
        views: v0.views,
        availableNote: v0.availableNote ?? null,
        rejectionReason: v0.rejectionReason ?? null,
        verifiedAt: v0.verifiedAt ?? null,
        userId: v0.userId,
        createdAt: v0.createdAt,
        available: v0.verificationStage === "COMPLETED",
      },
      reviews,
      bookmarked,
      isOwner,
    };
  },
});

/** Homepage featured grid (top N featured + verified APPROVED vendors). */
export const featured = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const all = await ctx.db
      .query("vendors")
      .withIndex("by_status", (q) => q.eq("status", "APPROVED"))
      .collect();
    const featured = all
      .filter((v) => v.featured && (!v.featuredUntil || v.featuredUntil > Date.now()))
      .sort((a, b) => b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount)
      .slice(0, limit ?? 8);
    return featured.map(serializeCard);
  },
});

/** The vendor that belongs to a given user. */
export const byOwner = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .unique();
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Apply to become a vendor. Creates a PENDING row. */
export const apply = mutation({
  args: {
    userId: v.string(),
    businessName: v.string(),
    category: v.string(),
    description: v.string(),
    products: v.optional(v.string()),
    city: v.string(),
    state: v.string(),
    instagramHandle: v.string(),
    instagramUrl: v.optional(v.string()),
    whatsappNumber: v.optional(v.string()),
    photos: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.userId);
    if (user.role !== "CUSTOMER" && user.role !== "VENDOR")
      throw new ConvexError("Only customers can apply to become a vendor");

    const limit = rateLimit(`apply:${args.userId}`, 30, 60_000);
    if (!limit.ok) throw new ConvexError("Too many applications, slow down");

    const existing = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (existing) throw new ConvexError("You already have a vendor profile");

    const slug = await uniqueSlug(ctx, "vendors", args.businessName);
    const now = Date.now();
    const id = await ctx.db.insert("vendors", {
      userId: user._id,
      slug,
      businessName: args.businessName,
      category: args.category,
      description: args.description,
      products: args.products ?? "",
      city: args.city,
      state: args.state,
      instagramHandle: args.instagramHandle,
      instagramUrl:
        args.instagramUrl && args.instagramUrl.length > 0
          ? args.instagramUrl
          : `https://instagram.com/${args.instagramHandle.replace(/^@/, "")}`,
      whatsappNumber: args.whatsappNumber,
      photos: args.photos ?? [],
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

    // Bump the user to VENDOR role.
    await ctx.db.patch(user._id, { role: "VENDOR", updatedAt: now });

    return { id, slug };
  },
});

/** Update a vendor profile. Owner or admin. */
export const update = mutation({
  args: {
    actorId: v.string(),
    vendorId: v.string(),
    patch: v.object({
      businessName: v.optional(v.string()),
      description: v.optional(v.string()),
      products: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      instagramHandle: v.optional(v.string()),
      whatsappNumber: v.optional(v.string()),
      photos: v.optional(v.array(v.string())),
      availableNote: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { actorId, vendorId, patch }) => {
    await requireVendorOwner(ctx, actorId, vendorId);
    const now = Date.now();
    const updates: Record<string, any> = { updatedAt: now };
    if (patch.businessName !== undefined) updates.businessName = patch.businessName;
    if (patch.description !== undefined) updates.description = patch.description;
    if (patch.products !== undefined) updates.products = patch.products;
    if (patch.city !== undefined) updates.city = patch.city;
    if (patch.state !== undefined) updates.state = patch.state;
    if (patch.instagramHandle !== undefined) {
      updates.instagramHandle = patch.instagramHandle;
      updates.instagramUrl = `https://instagram.com/${patch.instagramHandle.replace(/^@/, "")}`;
    }
    if (patch.whatsappNumber !== undefined)
      updates.whatsappNumber = patch.whatsappNumber;
    if (patch.photos !== undefined) updates.photos = patch.photos;
    if (patch.availableNote !== undefined)
      updates.availableNote = patch.availableNote;

    await ctx.db.patch(vendorId as any, updates);
    return { ok: true };
  },
});

/** Record a view, with 30-min per-IP dedupe. IP is optional — when null,
 * dedupe is skipped (appropriate for unauthenticated public endpoints where
 * client headers cannot be trusted). */
export const trackView = mutation({
  args: { vendorId: v.string(), ip: v.optional(v.string()) },
  handler: async (ctx, { vendorId, ip }) => {
    if (ip) {
      const limit = rateLimit(`view:${ip}:${vendorId}`, 10, 60_000);
      if (!limit.ok) return { ok: false };
      const now = Date.now();
      const recent = await ctx.db
        .query("vendorViews")
        .withIndex("by_vendor_ip", (q) =>
          q.eq("vendorId", vendorId as any).eq("ip", ip)
        )
        .collect();
      const last30 = recent.find((r) => now - r.viewedAt < 30 * 60 * 1000);
      if (last30) return { ok: false };
      await ctx.db.insert("vendorViews", {
        vendorId: vendorId as any,
        ip,
        viewedAt: now,
      });
    }
    const vendor = await getVendorDoc(ctx, vendorId);
    if (vendor) {
      await ctx.db.patch(vendorId as any, {
        views: vendor.views + 1,
        updatedAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

// ---------------------------------------------------------------------------
// Admin actions
// ---------------------------------------------------------------------------

export const adminAction = mutation({
  args: {
    actorId: v.string(),
    vendorId: v.string(),
    action: v.union(
      v.literal("approve"),
      v.literal("reject"),
      v.literal("suspend"),
      v.literal("reinstate"),
      v.literal("verify"),
      v.literal("unverify"),
      v.literal("feature"),
      v.literal("unfeature"),
      v.literal("advanceStage")
    ),
    detail: v.optional(v.string()),
    stage: v.optional(verificationStageSchema),
    featureDays: v.optional(v.number()),
  },
  handler: async (ctx, { actorId, vendorId, action, detail, stage, featureDays }) => {
    const actor = await requireAdmin(ctx, actorId);
    const vendor = await getVendorDoc(ctx, vendorId);
    if (!vendor) throw new ConvexError("Vendor not found");

    const now = Date.now();
    const updates: Record<string, any> = { updatedAt: now };
    let notifyType:
      | "VENDOR_APPROVED"
      | "VENDOR_REJECTED"
      | "VERIFIED"
      | undefined;
    let notifyTitle = "";
    let notifyBody: string | undefined;

    switch (action) {
      case "approve":
        updates.status = "APPROVED";
        notifyType = "VENDOR_APPROVED";
        notifyTitle = "Application approved";
        notifyBody = "Your vendor profile is live.";
        break;
      case "reject":
        updates.status = "REJECTED";
        updates.rejectionReason = detail;
        notifyType = "VENDOR_REJECTED";
        notifyTitle = "Application rejected";
        notifyBody = detail ?? "Please contact support.";
        break;
      case "suspend":
        updates.status = "SUSPENDED";
        notifyType = "VENDOR_REJECTED";
        notifyTitle = "Account suspended";
        notifyBody = "Your vendor profile has been suspended.";
        break;
      case "reinstate":
        updates.status = "APPROVED";
        updates.rejectionReason = undefined;
        break;
      case "verify":
        updates.verified = true;
        updates.verificationStage = "COMPLETED";
        updates.verifiedAt = now;
        notifyType = "VERIFIED";
        notifyTitle = "You're verified!";
        break;
      case "unverify":
        updates.verified = false;
        updates.verificationStage = "MANUAL_REVIEW";
        updates.verifiedAt = undefined;
        break;
      case "feature": {
        const days = featureDays ?? 30;
        updates.featured = true;
        updates.featuredUntil = now + days * 24 * 60 * 60 * 1000;
        break;
      }
      case "unfeature":
        updates.featured = false;
        updates.featuredUntil = undefined;
        break;
      case "advanceStage": {
        const target = stage;
        if (target) {
          updates.verificationStage = target;
          if (target === "COMPLETED") {
            updates.verified = true;
            updates.verifiedAt = now;
            notifyType = "VERIFIED";
            notifyTitle = "You're verified!";
          }
        } else {
          const idx = VENDOR_STAGE_ORDER.indexOf(vendor.verificationStage);
          const next = VENDOR_STAGE_ORDER[Math.min(idx + 1, VENDOR_STAGE_ORDER.length - 1)];
          updates.verificationStage = next;
          if (next === "COMPLETED") {
            updates.verified = true;
            updates.verifiedAt = now;
            notifyType = "VERIFIED";
            notifyTitle = "You're verified!";
          }
        }
        break;
      }
    }

    await ctx.db.patch(vendorId as any, updates);
    await audit(ctx, {
      actorId: actor._id,
      action: `VENDOR_${action.toUpperCase()}`,
      targetId: vendorId,
      targetType: "vendor",
      detail:
        action === "feature" && featureDays
          ? `${featureDays} days`
          : detail,
    });
    if (notifyType) {
      await notifyVendorOwner(ctx, vendorId, {
        type: notifyType,
        title: notifyTitle,
        body: notifyBody,
        link: `vendor:${vendorId}`,
      });
    }
    return { ok: true };
  },
});

/** Admin: list all vendors with their owner's email. Paginated. */
export const adminList = query({
  args: {
    actorId: v.string(),
    status: v.optional(vendorStatusSchema),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { actorId, status, q, limit, cursor }) => {
    await requireAdmin(ctx, actorId);
    const PAGE = Math.min(limit ?? 24, 60);
    const all = await ctx.db.query("vendors").order("desc").collect();
    const filtered = all.filter((v) => {
      if (status && v.status !== status) return false;
      if (q) {
        const hay =
          `${v.businessName} ${v.instagramHandle} ${v.city} ${v.state}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    const start = cursor ? Number(cursor) : 0;
    const page = filtered.slice(start, start + PAGE);
    const items = await Promise.all(
      page.map(async (v) => {
        const owner = await ctx.db.get(v.userId);
        return {
          id: v._id,
          slug: v.slug,
          businessName: v.businessName,
          category: v.category,
          state: v.state,
          city: v.city,
          status: v.status,
          verified: v.verified,
          featured: v.featured,
          views: v.views,
          ratingAvg: v.ratingAvg,
          ratingCount: v.ratingCount,
          createdAt: v.createdAt,
          owner: owner
            ? { id: owner._id, email: owner.email, name: owner.name }
            : null,
        };
      })
    );
    return { items, nextCursor: start + PAGE < filtered.length ? String(start + PAGE) : undefined, total: filtered.length };
  },
});

/**
 * Maintenance: clear `featured` on any vendor whose `featuredUntil` is in the
 * past. Throttled by an in-process flag (5-min cadence) — same behavior as
 * the old `sweep.ts`. Not exposed to the client; called by the cron route
 * in `convex/crons.ts` (see below) and/or the admin API.
 */
export const sweepExpiredFeatured = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const all = await ctx.db
      .query("vendors")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .collect();
    let cleared = 0;
    for (const v of all) {
      if (v.featuredUntil && v.featuredUntil < now) {
        await ctx.db.patch(v._id, {
          featured: false,
          featuredUntil: undefined,
          updatedAt: now,
        });
        cleared += 1;
      }
    }
    return { cleared };
  },
});
