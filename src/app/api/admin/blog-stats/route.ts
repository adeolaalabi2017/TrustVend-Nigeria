import { NextResponse } from "next/server";
import { api, convexQuery, requireAdminUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const actorId = await requireAdminUserId().catch(() => null);
  if (!actorId)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const stats = await convexQuery(api.stats.adminBlogStats, { actorId });
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
