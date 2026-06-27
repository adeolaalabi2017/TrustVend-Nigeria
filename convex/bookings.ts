/**
 * TrustVend Nigeria — Bookings.
 *
 * Replaces /api/bookings and /api/bookings/[id].
 * Includes a transactional state machine (mirrors the Prisma version).
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  bookingStatusSchema,
  canTransitionBooking,
  getBookingDoc,
  getUserDoc,
  getVendorDoc,
  notify,
  notifyVendorOwner,
  requireUser,
} from "./_helpers";

export const listMine = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const me = await requireUser(ctx, userId);
    if (me.role === "VENDOR") {
      const myVendors = await ctx.db
        .query("vendors")
        .withIndex("by_user", (q) => q.eq("userId", userId as any))
        .collect();
      const ids = new Set(myVendors.map((v) => String(v._id)));
      const all = await ctx.db.query("bookings").order("desc").collect();
      return all.filter((b) => ids.has(String(b.vendorId)));
    }
    return await ctx.db
      .query("bookings")
      .withIndex("by_customer", (q) => q.eq("customerId", userId as any))
      .order("desc")
      .collect();
  },
});

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireUser(ctx, userId);
    const myVendors = await ctx.db
      .query("vendors")
      .withIndex("by_user", (q) => q.eq("userId", userId as any))
      .collect();
    const vendorIds = new Set(myVendors.map((v) => String(v._id)));
    const all = await ctx.db.query("bookings").order("desc").collect();
    return all
      .filter((b) => vendorIds.has(String(b.vendorId)))
      .map((b) => ({
        id: b._id,
        status: b.status,
        eventType: b.eventType,
        eventDate: b.eventDate,
        location: b.location,
        notes: b.notes ?? null,
        customerName: b.customerName,
        customerEmail: b.customerEmail,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }));
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    vendorId: v.string(),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    eventDate: v.string(),
    eventType: v.string(),
    location: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.userId);
    if (me.role === "ADMIN")
      throw new ConvexError("Admins cannot create bookings");
    const vendor = await getVendorDoc(ctx, args.vendorId);
    if (!vendor) throw new ConvexError("Vendor not found");
    if (String(vendor.userId) === String(me._id))
      throw new ConvexError("Cannot book yourself");

    const now = Date.now();
    const id = await ctx.db.insert("bookings", {
      vendorId: args.vendorId as any,
      customerId: me._id,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      eventDate: args.eventDate,
      eventType: args.eventType,
      location: args.location,
      notes: args.notes,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    });

    await notifyVendorOwner(ctx, args.vendorId, {
      type: "BOOKING_REQUEST",
      title: `New booking from ${args.customerName}`,
      body: `${args.eventType} on ${args.eventDate}`,
      link: `bookings:${id}`,
    });

    return { id };
  },
});

export const update = mutation({
  args: {
    userId: v.string(),
    bookingId: v.string(),
    action: v.union(
      v.literal("confirm"),
      v.literal("decline"),
      v.literal("cancel")
    ),
  },
  handler: async (ctx, { userId, bookingId, action }) => {
    const me = await requireUser(ctx, userId);
    const b = await getBookingDoc(ctx, bookingId);
    if (!b) throw new ConvexError("Booking not found");
    const vendor = await getVendorDoc(ctx, b.vendorId);

    const isCustomer = String(b.customerId) === String(me._id);
    const isVendorOwner = !!vendor && String(vendor.userId) === String(me._id);
    const isAdmin = me.role === "ADMIN";
    if (!isCustomer && !isVendorOwner && !isAdmin)
      throw new ConvexError("Not a participant");

    const target = (
      {
        confirm: "CONFIRMED",
        decline: "DECLINED",
        cancel: "CANCELLED",
      } as const
    )[action];

    if (!canTransitionBooking(b.status, target))
      throw new ConvexError(
        `Cannot transition booking from ${b.status} to ${target}`
      );

    if (target === "CONFIRMED" && !isVendorOwner && !isAdmin)
      throw new ConvexError("Only the vendor can confirm a booking");
    if (target === "DECLINED" && !isVendorOwner && !isAdmin)
      throw new ConvexError("Only the vendor can decline a booking");

    await ctx.db.patch(bookingId as any, {
      status: target,
      updatedAt: Date.now(),
    });

    const noteType =
      target === "CONFIRMED"
        ? "BOOKING_CONFIRMED"
        : target === "DECLINED"
          ? "BOOKING_DECLINED"
          : "BOOKING_CANCELLED";
    const recipientId = isCustomer ? vendor?.userId : b.customerId;
    if (recipientId) {
      await notify(ctx, {
        userId: recipientId as any,
        type: noteType,
        title: `Booking ${target.toLowerCase()}`,
        body: `${b.eventType} on ${b.eventDate}`,
        link: "bookings",
      });
    }
    return { ok: true };
  },
});
