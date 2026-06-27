import { NextResponse } from "next/server";
import { api, convexQuery, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ items: [], unread: 0 }, { status: 401 });
  try {
    const result = await convexQuery(api.notifications.list, { userId });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { items: [], unread: 0, error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
