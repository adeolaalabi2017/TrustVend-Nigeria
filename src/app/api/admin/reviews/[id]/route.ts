import { NextResponse } from "next/server";
import { api, convexMutate, requireAdminUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const actorId = await requireAdminUserId().catch(() => null);
  if (!actorId)
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const result = await convexMutate(api.reviews.adminSetHidden, {
      actorId,
      reviewId: params.id,
      hidden: !!body.hidden,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
