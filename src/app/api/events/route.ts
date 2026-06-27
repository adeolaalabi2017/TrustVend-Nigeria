import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const upcomingOnly = url.searchParams.get("upcomingOnly") !== "false";
  try {
    const result = await convexQuery(api.events.list, {
      q,
      upcomingOnly,
      limit: 12,
    } as any);
    return NextResponse.json({
      events: result.items,
      nextCursor: result.nextCursor,
    });
  } catch (err) {
    return NextResponse.json(
      { events: [], error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const result = await convexMutate(api.events.create, { userId, ...body });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
