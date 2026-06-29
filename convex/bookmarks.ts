/**
 * TrustVend Nigeria — Bookmarks (vendor) + EventBookmarks (events).
 *
 * Both tables share the same shape (userId, targetId, createdAt) and
 * the same toggle/list semantics, so they live in one file.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./_helpers";

// ---------------------------------------------------------------------------
// Vendor bookmarks
// ---------------------------------------------------------------------------

export const listMine = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireUser(ctx, userId);
    const rows = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .order("desc")
      .collect();
    return await Promise.all(
      rows.map(async (b) => {
        const v0 = await ctx.db.get(b.vendorId);
        return v0
          ? {
              vendorId: b.vendorId,
              createdAt: b.createdAt,
              vendor: {
                id: v0._id,
                slug: v0.slug,
                businessName: v0.businessName,
                category: v0.category,
                state: v0.state,
                city: v0.city,
                coverPhoto: v0.photos[0] ?? null,
                verified: v0.verified,
                ratingAvg: v0.ratingAvg,
                ratingCount: v0.ratingCount,
              },
            }
          : null;
      })
    ).then((arr) => arr.filter(Boolean));
  },
});

export const isBookmarked = query({
  args: { userId: v.string(), vendorId: v.string() },
  handler: async (ctx, { userId, vendorId }) => {
    const row = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_vendor", (q) =>
        q.eq("userId", userId as any).eq("vendorId", vendorId as any)
      )
      .unique();
    return !!row;
  },
});

/**
 * Returns the set of vendor IDs the current user has bookmarked.
 * Used by VendorCard on listing pages so each card can seed its own
 * bookmarked state without triggering one query per card.
 */
export const getMyBookmarkSet = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const rows = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .collect();
    return rows.map((b) => String(b.vendorId));
  },
});

export const toggle = mutation({
  args: { userId: v.string(), vendorId: v.string() },
  handler: async (ctx, { userId, vendorId }) => {
    await requireUser(ctx, userId);
    const existing = await ctx.db
      .query("bookmarks")
      .withIndex("by_user_vendor", (q) =>
        q.eq("userId", userId as any).eq("vendorId", vendorId as any)
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    }
    await ctx.db.insert("bookmarks", {
      userId: userId as any,
      vendorId: vendorId as any,
      createdAt: Date.now(),
    });
    return { bookmarked: true };
  },
});

// ---------------------------------------------------------------------------
// Event bookmarks
// ---------------------------------------------------------------------------

export const listEventBookmarks = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireUser(ctx, userId);
    const rows = await ctx.db
      .query("eventBookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .order("desc")
      .collect();
    return await Promise.all(
      rows.map(async (b) => {
        const e = await ctx.db.get(b.eventId);
        return e
          ? {
              eventId: b.eventId,
              createdAt: b.createdAt,
              event: {
                id: e._id,
                slug: e.slug,
                title: e.title,
                eventDate: e.eventDate,
                location: e.location,
                coverImage: e.coverImage ?? null,
              },
            }
          : null;
      })
    ).then((arr) => arr.filter(Boolean));
  },
});

export const toggleEventBookmark = mutation({
  args: { userId: v.string(), eventId: v.string() },
  handler: async (ctx, { userId, eventId }) => {
    await requireUser(ctx, userId);
    const existing = await ctx.db
      .query("eventBookmarks")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId as any).eq("eventId", eventId as any)
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { bookmarked: false };
    }
    await ctx.db.insert("eventBookmarks", {
      userId: userId as any,
      eventId: eventId as any,
      createdAt: Date.now(),
    });
    return { bookmarked: true };
  },
});
