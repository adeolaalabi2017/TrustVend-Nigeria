/**
 * TrustVend Nigeria — Blog posts.
 *
 * Replaces /api/posts, /api/posts/[id], /api/admin/posts.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { audit, getPostDoc, requireAdmin, uniqueSlug } from "./_helpers";

export const list = query({
  args: {
    q: v.optional(v.string()),
    tag: v.optional(v.string()),
    onlyPublished: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, { q, tag, onlyPublished, limit, cursor }) => {
    const all = await ctx.db.query("posts").order("desc").collect();
    const filtered = all.filter((p) => {
      if ((onlyPublished ?? true) && !p.published) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (q) {
        const hay = `${p.title} ${p.excerpt} ${p.content}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
    const start = cursor ? Number(cursor) : 0;
    const cap = Math.min(limit ?? 12, 60);
    const items = await Promise.all(
      filtered.slice(start, start + cap).map(async (p) => {
        const author = await ctx.db.get(p.authorId);
        return { ...serialize(p), authorName: author?.name ?? "TrustVend" };
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

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const p = await ctx.db
      .query("posts")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!p) return null;
    const author = await ctx.db.get(p.authorId);
    return {
      post: {
        ...serialize(p),
        author: { id: author?._id ?? null, name: author?.name ?? "TrustVend" },
      },
    };
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const p = await getPostDoc(ctx, id);
    if (!p) return null;
    const author = await ctx.db.get(p.authorId);
    return {
      post: {
        ...serialize(p),
        author: { id: author?._id ?? null, name: author?.name ?? "TrustVend" },
      },
    };
  },
});

export const create = mutation({
  args: {
    actorId: v.string(),
    title: v.string(),
    excerpt: v.string(),
    content: v.string(),
    coverImage: v.optional(v.string()),
    tags: v.array(v.string()),
    published: v.boolean(),
  },
  handler: async (ctx, { actorId, ...rest }) => {
    const actor = await requireAdmin(ctx, actorId);
    const slug = await uniqueSlug(ctx, "posts", rest.title);
    const now = Date.now();
    const id = await ctx.db.insert("posts", {
      authorId: actor._id,
      title: rest.title,
      slug,
      excerpt: rest.excerpt,
      content: rest.content,
      coverImage: rest.coverImage,
      tags: rest.tags,
      published: rest.published,
      views: 0,
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, {
      actorId: actor._id,
      action: "POST_CREATE",
      targetId: id,
      targetType: "post",
    });
    return { id, slug };
  },
});

export const update = mutation({
  args: {
    actorId: v.string(),
    id: v.string(),
    title: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    content: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, { actorId, id, ...patch }) => {
    const actor = await requireAdmin(ctx, actorId);
    const post = await getPostDoc(ctx, id);
    if (!post) throw new ConvexError("Post not found");
    const updates: Record<string, any> = { updatedAt: Date.now() };
    for (const k of [
      "title",
      "excerpt",
      "content",
      "coverImage",
      "tags",
      "published",
    ] as const) {
      if ((patch as any)[k] !== undefined) updates[k] = (patch as any)[k];
    }
    await ctx.db.patch(id as any, updates);
    await audit(ctx, {
      actorId: actor._id,
      action: "POST_UPDATE",
      targetId: id,
      targetType: "post",
    });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { actorId: v.string(), id: v.string() },
  handler: async (ctx, { actorId, id }) => {
    const actor = await requireAdmin(ctx, actorId);
    await ctx.db.delete(id as any);
    await audit(ctx, {
      actorId: actor._id,
      action: "POST_DELETE",
      targetId: id,
      targetType: "post",
    });
    return { ok: true };
  },
});

export const trackView = mutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const p = await getPostDoc(ctx, id);
    if (!p || !p.published) return { ok: false };
    await ctx.db.patch(id as any, { views: p.views + 1 });
    return { ok: true };
  },
});

function serialize(p: any) {
  return {
    id: p._id,
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content,
    coverImage: p.coverImage ?? null,
    tags: p.tags,
    published: p.published,
    views: p.views,
    authorId: p.authorId,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}
