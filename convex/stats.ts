/**
 * TrustVend Nigeria — Stats / counters.
 *
 * Replaces /api/stats and /api/admin/stats, /api/admin/blog-stats.
 *
 * Shapes are designed to be consumed directly by views (no client-side
 * derivation needed).
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import { getUserDoc, requireAdmin, requireUser } from "./_helpers";

export const home = query({
  args: {},
  handler: async (ctx) => {
    const vendors = await ctx.db.query("vendors").collect();
    const approved = vendors.filter((v) => v.status === "APPROVED");
    const verified = approved.filter((v) => v.verified);
    const events = await ctx.db.query("events").collect();
    const upcoming = events.filter((e) => e.eventDate > Date.now()).length;

    const users = await ctx.db.query("users").collect();
    const customers = users.filter((u) => u.role === "CUSTOMER" && !u.banned).length;
    const states = new Set(approved.map((v) => v.state).filter(Boolean)).size;

    const reviews = await ctx.db.query("reviews").collect();
    const visibleReviews = reviews.filter((r) => !r.hidden);
    const avgRating =
      visibleReviews.length > 0
        ? visibleReviews.reduce((s, r) => s + r.rating, 0) / visibleReviews.length
        : 0;

    return {
      vendors: approved.length,
      verified: verified.length,
      categories: new Set(approved.map((v) => v.category)).size,
      upcomingEvents: upcoming,
      customers,
      states,
      avgRating,
    };
  },
});

export const adminOverview = query({
  args: { actorId: v.string() },
  handler: async (ctx, { actorId }) => {
    await requireAdmin(ctx, actorId);
    const vendors = await ctx.db.query("vendors").collect();
    const users = await ctx.db.query("users").collect();
    const reviews = await ctx.db.query("reviews").collect();
    const posts = await ctx.db.query("posts").collect();
    const events = await ctx.db.query("events").collect();
    const bookmarks = await ctx.db.query("bookmarks").collect();
    const threads = await ctx.db.query("threads").collect();

    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const recentVendors = vendors.filter((v) => v.createdAt > now - monthMs);
    const recentUsers = users.filter((u) => u.createdAt > now - monthMs);

    const customers = users.filter((u) => u.role === "CUSTOMER" && !u.banned).length;
    const approvedList = vendors.filter((v) => v.status === "APPROVED");
    const verified = approvedList.filter((v) => v.verified).length;

    // Top categories
    const catCounts = new Map<string, number>();
    for (const v of vendors) {
      if (v.status === "APPROVED")
        catCounts.set(v.category, (catCounts.get(v.category) ?? 0) + 1);
    }
    const topCategories = [...catCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Top vendors by views
    const topVendors = [...vendors]
      .filter((v) => v.status === "APPROVED")
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map((v) => ({
        id: v._id,
        businessName: v.businessName,
        category: v.category,
        views: v.views,
        ratingAvg: v.ratingAvg,
      }));

    // New vendor signups — last 6 months (oldest first for chart order)
    const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthBuckets: { label: string; start: number; end: number }[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const start = d.getTime();
      const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1).getTime();
      monthBuckets.push({ label: MONTH_LABELS[d.getMonth()], start, end });
    }
    const vendorsPerMonth = monthBuckets.map((b) => ({
      label: b.label,
      count: vendors.filter((v) => v.createdAt >= b.start && v.createdAt < b.end).length,
    }));

    // Recent applications (5 most recent vendor applications, any status)
    const recentApplications = await Promise.all(
      [...vendors]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 5)
        .map(async (v) => {
          const owner = await ctx.db.get(v.userId);
          return {
            id: v._id,
            businessName: v.businessName,
            category: v.category,
            createdAt: v.createdAt,
            status: v.status,
            verified: v.verified,
            instagramHandle: v.instagramHandle,
            ownerEmail: owner?.email ?? "",
          };
        })
    );

    return {
      totals: {
        vendors: vendors.length,
        users: users.length,
        reviews: reviews.length,
        posts: posts.length,
        events: events.length,
        pending: vendors.filter((v) => v.status === "PENDING").length,
        approved: vendors.filter((v) => v.status === "APPROVED").length,
        suspended: vendors.filter((v) => v.status === "SUSPENDED").length,
        rejected: vendors.filter((v) => v.status === "REJECTED").length,
        customers,
        verified,
        bookmarks: bookmarks.length,
        enquiries: threads.length,
      },
      recent: {
        vendorsThisMonth: recentVendors.length,
        usersThisMonth: recentUsers.length,
      },
      topCategories,
      topVendors,
      vendorsPerMonth,
      recentApplications,
    };
  },
});

export const adminBlogStats = query({
  args: { actorId: v.string() },
  handler: async (ctx, { actorId }) => {
    await requireAdmin(ctx, actorId);
    const posts = await ctx.db.query("posts").collect();
    const published = posts.filter((p) => p.published);
    const drafts = posts.filter((p) => !p.published);
    const top = [...posts]
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)
      .map((p) => ({
        id: p._id,
        title: p.title,
        slug: p.slug,
        views: p.views,
        published: p.published,
      }));
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const monthly = posts.filter((p) => p.createdAt > now - monthMs).length;
    const totalViews = posts.reduce((s, p) => s + p.views, 0);
    const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthBuckets: { label: string; start: number; end: number }[] = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthBuckets.push({ label: MONTH_LABELS[d.getMonth()], start: d.getTime(), end: new Date(today.getFullYear(), today.getMonth() - i + 1, 1).getTime() });
    }
    const postsPerMonth = monthBuckets.map((b) => ({
      label: b.label,
      count: posts.filter((p) => p.createdAt >= b.start && p.createdAt < b.end).length,
    }));
    return {
      total: posts.length,
      published: published.length,
      drafts: drafts.length,
      monthly,
      totalViews,
      postsPerMonth,
      topPosts: top,
    };
  },
});

export const adminAudit = query({
  args: { actorId: v.string() },
  handler: async (ctx, { actorId }) => {
    await requireAdmin(ctx, actorId);
    const rows = await ctx.db
      .query("auditLogs")
      .order("desc")
      .take(100);
    return await Promise.all(
      rows.map(async (r) => {
        const actor = r.actorId ? await ctx.db.get(r.actorId) : null;
        return {
          id: r._id,
          action: r.action,
          targetId: r.targetId,
          targetType: r.targetType,
          detail: r.detail,
          createdAt: r.createdAt,
          actor: actor
            ? { id: actor._id, email: actor.email, name: actor.name }
            : null,
        };
      })
    );
  },
});

/**
 * Vendor dashboard stats: views, enquiries, bookmarks, reviews, rating
 * distribution, weekly activity, recent enquiries.
 */
export const vendorDashboard = query({
  args: { actorId: v.string() },
  handler: async (ctx, { actorId }) => {
    const actor = await requireUser(ctx, actorId);
    if (actor.banned) throw new Error("Account banned");
    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", actorId as any))
      .unique();
    if (!vendor) throw new Error("Vendor profile not found");

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .collect();
    const visibleReviews = reviews.filter((r) => !r.hidden);

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .collect();
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .collect();

    // Rating distribution (5 → 1)
    const distribution = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: visibleReviews.filter((r) => r.rating === star).length,
    }));

    // Weekly activity (last 7 days, oldest first) — shape consumed by MiniBarChart
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const dayStart = now - (6 - i) * day;
      const dayEnd = dayStart + day;
      const messages = threads.filter(
        (t) => t.lastMessageAt >= dayStart && t.lastMessageAt < dayEnd
      ).length;
      const bookmarkAdds = bookmarks.filter(
        (b) => b.createdAt >= dayStart && b.createdAt < dayEnd
      ).length;
      return {
        label: DAY_LABELS[new Date(dayStart).getDay()],
        count: messages + bookmarkAdds,
      };
    });

    // Recent enquiries — most recent threads with customer info and last-message preview.
    const recentEnquiries = await Promise.all(
      [...threads]
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt)
        .slice(0, 5)
        .map(async (t) => {
          const customer = await ctx.db.get(t.customerId);
          const lastMessage = await ctx.db
            .query("messages")
            .withIndex("by_thread_createdAt", (q) => q.eq("threadId", t._id))
            .order("desc")
            .first();
          const unreadCount = await ctx.db
            .query("messages")
            .withIndex("by_thread", (q) => q.eq("threadId", t._id))
            .filter((q) => q.eq(q.field("read"), false))
            .filter((q) => q.neq(q.field("senderId"), vendor.userId))
            .collect()
            .then((rows) => rows.length);
          return {
            id: t._id,
            customerId: t.customerId,
            customerName: customer?.name ?? "Customer",
            customerEmail: customer?.email ?? "",
            preview: lastMessage?.body ?? "",
            unread: unreadCount > 0,
            unreadCount,
            lastMessageAt: t.lastMessageAt,
          };
        })
    );

    return {
      vendor: {
        id: vendor._id,
        businessName: vendor.businessName,
        slug: vendor.slug,
        verified: vendor.verified,
        verificationStage: vendor.verificationStage,
        availableNote: vendor.availableNote ?? null,
        views: vendor.views,
        ratingAvg: vendor.ratingAvg,
        ratingCount: vendor.ratingCount,
        featured: vendor.featured,
        featuredUntil: vendor.featuredUntil ?? null,
      },
      totals: {
        views: vendor.views,
        enquiries: threads.length,
        bookmarks: bookmarks.length,
        reviews: visibleReviews.length,
      },
      ratingDistribution: distribution,
      weeklyActivity,
      recentReviews: await Promise.all(
        visibleReviews
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 5)
          .map(async (r) => {
            const author = await ctx.db.get(r.userId);
            return {
              id: r._id,
              rating: r.rating,
              comment: r.comment,
              createdAt: r.createdAt,
              author: author?.name ?? "Customer",
            };
          })
      ),
      enquiries: recentEnquiries,
    };
  },
});