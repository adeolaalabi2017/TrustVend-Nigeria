/**
 * TrustVend Nigeria — Notifications.
 *
 * Replaces /api/notifications and /api/notifications/mark-read.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getNotificationDoc, requireUser } from "./_helpers";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    await requireUser(ctx, userId);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", userId as any))
      .order("desc")
      .take(30);
    const unread = rows.filter((n) => !n.read).length;
    return { items: rows, unread };
  },
});

export const markRead = mutation({
  args: {
    userId: v.string(),
    id: v.optional(v.string()),
    all: v.optional(v.boolean()),
  },
  handler: async (ctx, { userId, id, all }) => {
    await requireUser(ctx, userId);
    if (all) {
      const rows = await ctx.db
        .query("notifications")
        .withIndex("by_user_read", (q) =>
          q.eq("userId", userId as any).eq("read", false)
        )
        .collect();
      for (const n of rows) await ctx.db.patch(n._id, { read: true });
      return { updated: rows.length };
    }
    if (!id) throw new ConvexError("Provide an id or set all=true");
    const n = await getNotificationDoc(ctx, id);
    if (!n) throw new ConvexError("Notification not found");
    if (String(n.userId) !== String(userId))
      throw new ConvexError("Not your notification");
    await ctx.db.patch(n._id, { read: true });
    return { updated: 1 };
  },
});
