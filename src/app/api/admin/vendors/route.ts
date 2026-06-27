import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, requireAdminUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const actorId = await requireAdminUserId().catch(() => null);
  if (!actorId)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  try {
    const vendors = await convexQuery(api.vendors.adminList, {
      actorId,
      status: status as any,
      q,
    });
    return NextResponse.json({ vendors });
  } catch (err) {
    return NextResponse.json(
      { vendors: [], error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const actorId = await requireAdminUserId().catch(() => null);
  if (!actorId)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const result = await convexMutate(api.vendors.adminAction, {
      actorId,
      vendorId: body.vendorId,
      action: body.action,
      detail: body.detail,
      stage: body.stage,
      featureDays: body.featureDays,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
