/**
 * TrustVend Nigeria — Events.
 *
 * Replaces /api/events and /api/events/[id].
 * Event bookmarking is in convex/bookmarks.ts (toggleEventBookmark).
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getEventDoc,
  getUserDoc,
  getVendorDoc,
  requireUser,
  uniqueSlug,
} from "./_helpers";

export const list = query({
  args: {
    q: v.optional(v.string()),
    category: v.optional(v.string()),
    state: v.optional(v.string()),
    upcomingOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { q, category, state, upcomingOnly, limit, cursor }) => {
    const all = await ctx.db.query("events").order("desc").collect();
    const filtered = all.filter((e) => {
      if (upcomingOnly && e.eventDate < Date.now()) return false;
      if (category && e.category !== category) return false;
      if (state && e.state !== state) return false;
      if (q) {
        const hay = `${e.title} ${e.description} ${e.location}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    filtered.sort((a, b) => b.eventDate - a.eventDate);
    const start = cursor ? Number(cursor) : 0;
    const cap = Math.min(limit ?? 12, 60);
    const items = await Promise.all(
      filtered.slice(start, start + cap).map(async (e) => {
        const vendor = e.vendorId ? await ctx.db.get(e.vendorId) : null;
        return { ...serialize(e), vendor: vendor ? await vendorSummary(ctx, vendor) : null };
      })
    );
    return {
      items,
      nextCursor:
        start + cap < filtered.length ? String(start + cap) : undefined,
      total: filtered.length,
    };
  },
});

export const getById = query({
  args: { id: v.string(), viewerId: v.optional(v.string()) },
  handler: async (ctx, { id, viewerId }) => {
    const e = await getEventDoc(ctx, id);
    if (!e) return null;
    const vendor = e.vendorId ? await ctx.db.get(e.vendorId) : null;
    const isOrganizer =
      !!viewerId && String(e.organizerId) === String(viewerId);
    let bookmarked = false;
    if (viewerId) {
      const bm = await ctx.db
        .query("eventBookmarks")
        .withIndex("by_user", (q) => q.eq("userId", viewerId as any))
        .filter((q) => q.eq(q.field("eventId"), id as any))
        .first();
      bookmarked = !!bm;
    }
    return {
      event: {
        ...serialize(e),
        vendor: vendor ? await vendorSummary(ctx, vendor) : null,
      },
      isOrganizer,
      bookmarked,
    };
  },
});

async function vendorSummary(ctx: any, vendor: any) {
  const first = (vendor.photos ?? [])[0] ?? null;
  return {
    id: vendor._id,
    businessName: vendor.businessName,
    photo: first,
    verified: vendor.verified ?? false,
  };
}

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const e = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!e) return null;
    return serialize(e);
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    vendorId: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    coverImage: v.optional(v.string()),
    eventDate: v.number(),
    endDate: v.optional(v.number()),
    location: v.string(),
    state: v.optional(v.string()),
    category: v.optional(v.string()),
    price: v.optional(v.string()),
    rsvpLink: v.optional(v.string()),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, { userId, ...rest }) => {
    const me = await requireUser(ctx, userId);
    if (me.role === "CUSTOMER")
      throw new ConvexError("Only vendors and admins can create events");
    if (rest.vendorId) {
      const vendor = await getVendorDoc(ctx, rest.vendorId);
      if (!vendor) throw new ConvexError("Vendor not found");
      if (String(vendor.userId) !== String(me._id) && me.role !== "ADMIN")
        throw new ConvexError("You don't own that vendor");
    }
    const slug = await uniqueSlug(ctx, "events", rest.title);
    const now = Date.now();
    const id = await ctx.db.insert("events", {
      vendorId: rest.vendorId ? (rest.vendorId as any) : undefined,
      organizerId: me._id,
      title: rest.title,
      slug,
      description: rest.description,
      coverImage: rest.coverImage,
      eventDate: rest.eventDate,
      endDate: rest.endDate,
      location: rest.location,
      state: rest.state,
      category: rest.category,
      price: rest.price,
      rsvpLink: rest.rsvpLink,
      capacity: rest.capacity,
      createdAt: now,
      updatedAt: now,
    });
    return { id, slug };
  },
});

export const update = mutation({
  args: {
    userId: v.string(),
    id: v.string(),
    patch: v.object({
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      coverImage: v.optional(v.string()),
      eventDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      location: v.optional(v.string()),
      state: v.optional(v.string()),
      category: v.optional(v.string()),
      price: v.optional(v.string()),
      rsvpLink: v.optional(v.string()),
      capacity: v.optional(v.number()),
    }),
  },
  handler: async (ctx, { userId, id, patch }) => {
    const me = await requireUser(ctx, userId);
    const e = await getEventDoc(ctx, id);
    if (!e) throw new ConvexError("Event not found");
    if (me.role !== "ADMIN" && String(e.organizerId) !== String(me._id))
      throw new ConvexError("Not the organizer");
    const updates: Record<string, any> = { updatedAt: Date.now() };
    for (const k of [
      "title",
      "description",
      "coverImage",
      "eventDate",
      "endDate",
      "location",
      "state",
      "category",
      "price",
      "rsvpLink",
      "capacity",
    ] as const) {
      if ((patch as any)[k] !== undefined) updates[k] = (patch as any)[k];
    }
    await ctx.db.patch(id as any, updates);
    return { ok: true };
  },
});

export const remove = mutation({
  args: { userId: v.string(), id: v.string() },
  handler: async (ctx, { userId, id }) => {
    const me = await requireUser(ctx, userId);
    const e = await getEventDoc(ctx, id);
    if (!e) throw new ConvexError("Event not found");
    if (me.role !== "ADMIN" && String(e.organizerId) !== String(me._id))
      throw new ConvexError("Not the organizer");
    await ctx.db.delete(id as any);
    const bms = await ctx.db
      .query("eventBookmarks")
      .withIndex("by_event", (q) => q.eq("eventId", id as any))
      .collect();
    for (const b of bms) await ctx.db.delete(b._id);
    return { ok: true };
  },
});

export const trackView = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const e = await getEventDoc(ctx, id);
    if (!e) return { ok: false };
    return { ok: true };
  },
});

export const byOwner = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const me = await requireUser(ctx, userId);
    if (me.role === "ADMIN") {
      const all = await ctx.db.query("events").order("desc").collect();
      return all.map(serialize);
    }
    const mine = await ctx.db
      .query("events")
      .withIndex("by_organizer", (q) => q.eq("organizerId", userId as any))
      .order("desc")
      .collect();
    return mine.map(serialize);
  },
});

function serialize(e: any) {
  return {
    id: e._id,
    vendorId: e.vendorId ?? null,
    organizerId: e.organizerId,
    title: e.title,
    slug: e.slug,
    description: e.description,
    coverImage: e.coverImage ?? null,
    eventDate: e.eventDate,
    endDate: e.endDate ?? null,
    location: e.location ?? "",
    state: e.state ?? "",
    category: e.category ?? "",
    price: e.price ?? null,
    rsvpLink: e.rsvpLink ?? null,
    capacity: e.capacity ?? null,
    views: e.views ?? 0,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}
