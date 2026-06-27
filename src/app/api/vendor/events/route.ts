import { NextResponse } from "next/server";
import { api, convexQuery, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ events: [] }, { status: 401 });
  try {
    const events = await convexQuery(api.events.byOwner, { userId });
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json(
      { events: [], error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
