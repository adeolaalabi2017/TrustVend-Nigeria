import { NextResponse } from "next/server";
import { api, convexQuery, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const data = await convexQuery(api.stats.vendorDashboard, { actorId: userId });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
