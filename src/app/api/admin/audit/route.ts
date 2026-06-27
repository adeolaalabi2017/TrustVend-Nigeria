import { NextResponse } from "next/server";
import { api, convexQuery, requireAdminUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const actorId = await requireAdminUserId().catch(() => null);
  if (!actorId)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const items = await convexQuery(api.stats.adminAudit, { actorId });
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { items: [], error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
