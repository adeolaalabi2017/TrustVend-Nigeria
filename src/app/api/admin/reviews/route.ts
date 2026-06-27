import { NextResponse } from "next/server";
import { api, convexQuery, requireAdminUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const actorId = await requireAdminUserId().catch(() => null);
  if (!actorId)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  try {
    const reviews = await convexQuery(api.reviews.adminList, { actorId });
    return NextResponse.json({ reviews });
  } catch (err) {
    return NextResponse.json(
      { reviews: [], error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
