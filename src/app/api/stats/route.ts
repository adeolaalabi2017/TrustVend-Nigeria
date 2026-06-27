import { NextResponse } from "next/server";
import { api, convexQuery } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await convexQuery(api.stats.home, {});
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json(
      { vendors: 0, verified: 0, categories: 0, upcomingEvents: 0 },
      { status: 500 }
    );
  }
}
