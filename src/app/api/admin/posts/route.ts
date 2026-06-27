import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, requireAdminUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const actorId = await requireAdminUserId().catch(() => null);
  if (!actorId)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const result = await convexQuery(api.posts.list, {
      onlyPublished: false,
      limit: 100,
    });
    return NextResponse.json({ posts: result.items });
  } catch (err) {
    return NextResponse.json(
      { posts: [], error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const actorId = await requireAdminUserId().catch(() => null);
  if (!actorId)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const result = await convexMutate(api.posts.create, {
      actorId,
      title: body.title,
      excerpt: body.excerpt,
      content: body.content,
      coverImage: body.coverImage,
      tags: Array.isArray(body.tags) ? body.tags : [],
      published: !!body.published,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
