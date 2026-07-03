import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, getUserId, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const viewerId = await getUserId();
    let result = await convexQuery(api.events.getById, { id: params.id, viewerId: viewerId ?? undefined });
    if (!result) {
      const bySlug = await convexQuery(api.events.getBySlug, { slug: params.id });
      if (!bySlug) return NextResponse.json({ error: "Not found" }, { status: 404 });
      result = bySlug as any;
    }
    const eventId = "event" in (result as any)
      ? (result as any).event.id
      : (result as any).id;
    await convexMutate(api.events.trackView, { id: eventId as string });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const result = await convexMutate(api.events.update, {
      userId,
      id: params.id,
      patch: body,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const result = await convexMutate(api.events.remove, { userId, id: params.id });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
