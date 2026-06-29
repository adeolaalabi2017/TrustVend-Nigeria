import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, requireAdminUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // Try by id first, then by slug.
    let result = await convexQuery(api.posts.getById, { id });
    if (!result) result = await convexQuery(api.posts.getBySlug, { slug: id });
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (result.post.published) await convexMutate(api.posts.trackView, { id: result.post.id });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actorId = await requireAdminUserId().catch(() => null);
  if (!actorId)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const result = await convexMutate(api.posts.update, {
      actorId,
      id,
      ...body,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actorId = await requireAdminUserId().catch(() => null);
  if (!actorId)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const result = await convexMutate(api.posts.remove, { actorId, id });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
