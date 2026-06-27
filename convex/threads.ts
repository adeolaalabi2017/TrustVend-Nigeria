/**
 * TrustVend Nigeria — Threads (customer ↔ vendor) and Messages.
 *
 * - list (scoped to caller: as customer or as vendor owner)
 * - open or reuse the unique (customerId, vendorId) thread
 * - getThread + markIncomingRead
 * - sendMessage (updates lastMessageAt + notifies recipient)
 *
 * Replaces: src/app/api/threads and /api/threads/[id]/messages.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getThreadDoc,
  getUserDoc,
  getVendorDoc,
  notify,
  requireUser,
} from "./_helpers";

const threadSummary = async (
  ctx: any,
  t: any,
  callerId: string
) => {
  const customer = await getUserDoc(ctx, t.customerId);
  const vendor = await getVendorDoc(ctx, t.vendorId);
  const last = await ctx.db
    .query("messages")
    .withIndex("by_thread", (q: any) => q.eq("threadId", t._id))
    .order("desc")
    .first();
  const unread = await ctx.db
    .query("messages")
    .withIndex("by_thread", (q: any) => q.eq("threadId", t._id))
    .filter((q: any) => q.eq(q.field("read"), false))
    .filter((q: any) => q.neq(q.field("senderId"), callerId))
    .collect()
    .then((rows: any[]) => rows.length);
  return {
    id: t._id,
    customerId: t.customerId,
    vendorId: t.vendorId,
    lastMessageAt: t.lastMessageAt,
    customer: customer
      ? { id: customer._id, name: customer.name ?? "Customer" }
      : null,
    vendor: vendor
      ? {
          id: vendor._id,
          slug: vendor.slug,
          businessName: vendor.businessName,
          coverPhoto: vendor.photos?.[0] ?? null,
          userId: vendor.userId,
        }
      : null,
    lastMessage: last
      ? {
          body: last.body,
          read: last.read,
          senderId: last.senderId,
          createdAt: last.createdAt,
        }
      : null,
    unread,
  };
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

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
      const all = await ctx.db.query("threads").order("desc").collect();
      const mine = all.filter((t) => ids.has(String(t.vendorId)));
      return await Promise.all(
        mine.map((t) => threadSummary(ctx, t, userId))
      );
    }
    const asCustomer = await ctx.db
      .query("threads")
      .withIndex("by_customer", (q) => q.eq("customerId", userId as any))
      .order("desc")
      .collect();
    return await Promise.all(
      asCustomer.map((t) => threadSummary(ctx, t, userId))
    );
  },
});

export const get = query({
  args: { threadId: v.string(), userId: v.string() },
  handler: async (ctx, { threadId, userId }) => {
    const t = await getThreadDoc(ctx, threadId);
    if (!t) return null;
    const me = await getUserDoc(ctx, userId);
    if (!me) throw new ConvexError("Not authenticated");
    const vendor = await getVendorDoc(ctx, t.vendorId);
    const ok =
      me.role === "ADMIN" ||
      String(t.customerId) === String(userId) ||
      (vendor && String(vendor.userId) === String(userId));
    if (!ok) throw new ConvexError("Not a participant");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread_createdAt", (q) => q.eq("threadId", t._id))
      .order("asc")
      .collect();

    return {
      id: t._id,
      customerId: t.customerId,
      vendorId: t.vendorId,
      lastMessageAt: t.lastMessageAt,
      messages: await Promise.all(
        messages.map(async (m) => {
          const author = await getUserDoc(ctx, m.senderId);
          return {
            id: m._id,
            body: m.body,
            read: m.read,
            senderId: m.senderId,
            createdAt: m.createdAt,
            author: author
              ? { id: author._id, name: author.name ?? "User" }
              : null,
          };
        })
      ),
    };
  },
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Open or reuse the unique (customerId, vendorId) thread and send the first
 * message. Replaces POST /api/threads.
 */
export const start = mutation({
  args: {
    userId: v.string(),
    vendorId: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { userId, vendorId, body }) => {
    const user = await requireUser(ctx, userId);
    const vendor = await getVendorDoc(ctx, vendorId);
    if (!vendor) throw new ConvexError("Vendor not found");
    if (String(vendor.userId) === String(user._id))
      throw new ConvexError("You cannot message your own vendor");
    if (!body.trim()) throw new ConvexError("Message body required");

    const now = Date.now();
    let thread = await ctx.db
      .query("threads")
      .withIndex("by_customer_vendor", (q) =>
        q.eq("customerId", user._id).eq("vendorId", vendor._id)
      )
      .unique();
    if (!thread) {
      const id = await ctx.db.insert("threads", {
        customerId: user._id,
        vendorId: vendor._id,
        lastMessageAt: now,
        createdAt: now,
        updatedAt: now,
      });
      thread = (await getThreadDoc(ctx, id))!;
    } else {
      await ctx.db.patch(thread._id, { lastMessageAt: now, updatedAt: now });
    }

    await ctx.db.insert("messages", {
      threadId: thread._id,
      senderId: user._id,
      body: body.trim(),
      read: false,
      createdAt: now,
    });

    await notify(ctx, {
      userId: vendor.userId,
      type: "NEW_ENQUIRY",
      title: `New enquiry from ${user.name ?? "a customer"}`,
      body: body.trim().slice(0, 120),
      link: `messages:${thread._id}`,
    });

    return { threadId: thread._id };
  },
});

/** Append a message to an existing thread. */
export const sendMessage = mutation({
  args: {
    userId: v.string(),
    threadId: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { userId, threadId, body }) => {
    const me = await requireUser(ctx, userId);
    const thread = await getThreadDoc(ctx, threadId);
    if (!thread) throw new ConvexError("Thread not found");
    const vendor = await getVendorDoc(ctx, thread.vendorId);
    const isParticipant =
      String(thread.customerId) === String(me._id) ||
      (vendor && String(vendor.userId) === String(me._id));
    if (!isParticipant && me.role !== "ADMIN")
      throw new ConvexError("Not a participant");
    if (!body.trim()) throw new ConvexError("Message body required");

    const now = Date.now();
    await ctx.db.insert("messages", {
      threadId: thread._id,
      senderId: me._id,
      body: body.trim(),
      read: false,
      createdAt: now,
    });
    await ctx.db.patch(thread._id, { lastMessageAt: now, updatedAt: now });

    const recipientId =
      String(thread.customerId) === String(me._id)
        ? vendor?.userId
        : thread.customerId;
    if (recipientId) {
      await notify(ctx, {
        userId: recipientId as any,
        type: "NEW_MESSAGE",
        title: `New message from ${me.name ?? "user"}`,
        body: body.trim().slice(0, 120),
        link: `messages:${thread._id}`,
      });
    }
    return { ok: true };
  },
});

/** Mark every incoming message in a thread as read. */
export const markRead = mutation({
  args: { userId: v.string(), threadId: v.string() },
  handler: async (ctx, { userId, threadId }) => {
    const me = await requireUser(ctx, userId);
    const thread = await getThreadDoc(ctx, threadId);
    if (!thread) throw new ConvexError("Thread not found");
    const vendor = await getVendorDoc(ctx, thread.vendorId);
    const isParticipant =
      String(thread.customerId) === String(me._id) ||
      (vendor && String(vendor.userId) === String(me._id));
    if (!isParticipant && me.role !== "ADMIN")
      throw new ConvexError("Not a participant");
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", thread._id))
      .collect();
    for (const m of msgs) {
      if (String(m.senderId) !== String(me._id) && !m.read) {
        await ctx.db.patch(m._id, { read: true });
      }
    }
    return { ok: true };
  },
});
