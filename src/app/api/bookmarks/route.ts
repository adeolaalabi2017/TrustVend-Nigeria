import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ bookmarks: [] }, { status: 401 });
  try {
    const bookmarks = await convexQuery(api.bookmarks.listMine, { userId });
    return NextResponse.json({ bookmarks });
  } catch (err) {
    return NextResponse.json(
      { bookmarks: [], error: err instanceof Error ? err.message : "Failed" },
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
    const result = await convexMutate(api.bookmarks.toggle, {
      userId,
      vendorId: body.vendorId,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
