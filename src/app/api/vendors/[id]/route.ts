import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, getUserId, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const vendor = await convexQuery(api.vendors.getById, { id });
    if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(vendor);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const result = await convexMutate(api.vendors.update, {
      actorId: userId,
      vendorId: id,
      patch: body,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
