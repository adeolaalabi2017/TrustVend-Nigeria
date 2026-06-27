import { NextResponse } from "next/server";
import { api, convexQuery, getUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ user: null });
  try {
    const me = await convexQuery(api.users.getMe, { userId });
    return NextResponse.json({ user: me?.user ?? null, vendor: me?.vendor ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
