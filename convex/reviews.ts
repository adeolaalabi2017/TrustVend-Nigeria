/**
 * TrustVend Nigeria — Review functions.
 *
 * - list (public, hidden filtered unless admin)
 * - upsert (one review per user/vendor pair) + transactional recompute
 * - admin: hide / restore
 *
 * Replaces: src/app/api/vendors/[id]/reviews and /api/admin/reviews.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  audit,
  getReviewDoc,
  getUserDoc,
  notifyVendorOwner,
  recomputeVendorRating,
  requireAdmin,
  requireUser,
} from "./_helpers";

export const listForVendor = query({
  args: {
    vendorId: v.string(),
    viewerId: v.optional(v.string()),
  },
  handler: async (ctx, { vendorId, viewerId }) => {
    let canSeeHidden = false;
    if (viewerId) {
      const viewer = await getUserDoc(ctx, viewerId);
      canSeeHidden = !!viewer && viewer.role === "ADMIN";
    }
    const all = await ctx.db
      .query("reviews")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendorId as any))
      .order("desc")
      .collect();
    const visible = all.filter((r) => canSeeHidden || !r.hidden);
    return await Promise.all(
      visible.map(async (r) => {
        const author = await getUserDoc(ctx, r.userId);
        return {
          id: r._id,
          rating: r.rating,
          comment: r.comment,
          hidden: r.hidden,
          createdAt: r.createdAt,
          author: author
            ? {
                id: author._id,
                name: author.name ?? "Anonymous",
                image: author.image ?? null,
              }
            : { id: null, name: "Anonymous", image: null },
        };
      })
    );
  },
});

export const adminList = query({
  args: { actorId: v.string() },
  handler: async (ctx, { actorId }) => {
    await requireAdmin(ctx, actorId);
    const all = await ctx.db.query("reviews").order("desc").collect();
    return await Promise.all(
      all.map(async (r) => {
        const author = await getUserDoc(ctx, r.userId);
        const vendor = await ctx.db.get(r.vendorId);
        return {
          id: r._id,
          rating: r.rating,
          comment: r.comment,
          hidden: r.hidden,
          createdAt: r.createdAt,
          author: author ? { name: author.name, email: author.email } : null,
          vendor: vendor ? { businessName: (vendor as any).businessName } : null,
        };
      })
    );
  },
});

export const upsert = mutation({
  args: {
    userId: v.string(),
    vendorId: v.string(),
    rating: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, { userId, vendorId, rating, comment }) => {
    const user = await requireUser(ctx, userId);
    if (user.role === "ADMIN")
      throw new ConvexError("Admins cannot review vendors");
    if (rating < 1 || rating > 5)
      throw new ConvexError("Rating must be 1-5");

    const vendor = await ctx.db.get(vendorId as any);
    if (!vendor) throw new ConvexError("Vendor not found");
    if (String((vendor as any).userId) === String(user._id))
      throw new ConvexError("You cannot review your own vendor profile");

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_vendor_user", (q) =>
        q.eq("vendorId", vendorId as any).eq("userId", user._id)
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        rating,
        comment,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("reviews", {
        vendorId: vendorId as any,
        userId: user._id,
        rating,
        comment,
        hidden: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await recomputeVendorRating(ctx, vendorId);

    await notifyVendorOwner(ctx, vendorId, {
      type: "NEW_REVIEW",
      title: `New ${rating}-star review`,
      body: comment.slice(0, 120),
      link: `vendor:${vendorId}`,
    });

    return { ok: true };
  },
});

export const adminSetHidden = mutation({
  args: {
    actorId: v.string(),
    reviewId: v.string(),
    hidden: v.boolean(),
  },
  handler: async (ctx, { actorId, reviewId, hidden }) => {
    const actor = await requireAdmin(ctx, actorId);
    const r = await getReviewDoc(ctx, reviewId);
    if (!r) throw new ConvexError("Review not found");
    await ctx.db.patch(reviewId as any, { hidden, updatedAt: Date.now() });
    await audit(ctx, {
      actorId: actor._id,
      action: hidden ? "REVIEW_HIDE" : "REVIEW_RESTORE",
      targetId: reviewId,
      targetType: "review",
    });
    await recomputeVendorRating(ctx, r.vendorId);
    return { ok: true };
  },
});
