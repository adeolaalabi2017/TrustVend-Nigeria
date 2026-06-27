import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ bookings: [] }, { status: 401 });
  try {
    const bookings = await convexQuery(api.bookings.listMine, { userId });
    return NextResponse.json({ bookings });
  } catch (err) {
    return NextResponse.json(
      { bookings: [], error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const result = await convexMutate(api.bookings.create, {
      userId,
      ...body,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
