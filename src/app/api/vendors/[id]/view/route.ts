import { NextResponse } from "next/server";
import { api, convexMutate } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    // IP is intentionally omitted: this is a public, unauthenticated endpoint
    // and the trackView mutation skips dedupe when ip is undefined. Client
    // headers cannot be trusted.
    const result = await convexMutate(api.vendors.trackView, { vendorId: id });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false });
  }
}
