import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, getUserId, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await getUserId();
  try {
    const reviews = await convexQuery(api.reviews.listForVendor, {
      vendorId: params.id,
      viewerId: userId ?? undefined,
    });
    return NextResponse.json({ reviews });
  } catch (err) {
    return NextResponse.json(
      { reviews: [], error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const result = await convexMutate(api.reviews.upsert, {
      userId,
      vendorId: params.id,
      rating: Number(body.rating),
      comment: String(body.comment ?? ""),
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
