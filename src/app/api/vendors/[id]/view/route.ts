import { NextResponse } from "next/server";
import { api, convexMutate } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await convexMutate(api.vendors.trackView, {
      vendorId: params.id,
      ip: null,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false });
  }
}
