import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { convexServer } from "@/lib/convex-server";
import { api } from "convex/_generated/api";

/**
 * Admin-only endpoint that idempotently seeds the marketplace with
 * 10 sample vendors across multiple categories (Fashion, Food,
 * Beauty, Photography, Events, Home, Tech). All vendors are created
 * already APPROVED + VERIFIED so they appear in every public listing
 * immediately.
 *
 * Body: none. Session-driven. Returns
 *   { ok: true, created, updated, total }
 *
 * Requires the caller to have role: "ADMIN". Safe to call repeatedly;
 * matched on `slug`, so re-running refreshes the same rows.
 */
export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin role required" },
      { status: 403 }
    );
  }

  try {
    const result = await convexServer().mutation(api.vendors.seedSamples, {
      actorId: userId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Seed failed" },
      { status: 400 }
    );
  }
}
