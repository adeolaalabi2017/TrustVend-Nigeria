import { NextResponse } from "next/server";
import { api, convexMutate } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const result = await convexMutate(api.vendors.trackView, {
      vendorId: params.id,
      ip: clientIp(req),
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ ok: false });
  }
}
