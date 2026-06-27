import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const args = {
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    sort: (url.searchParams.get("sort") ?? "recent") as any,
    verifiedOnly: url.searchParams.get("verifiedOnly") === "true",
    limit: url.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
  };
  try {
    const result = await convexQuery(api.vendors.list, args as any);
    return NextResponse.json({
      vendors: result.items,
      nextCursor: result.nextCursor,
      total: result.total,
    });
  } catch (err) {
    return NextResponse.json(
      { vendors: [], nextCursor: null, error: err instanceof Error ? err.message : "Failed" },
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
    const result = await convexMutate(api.vendors.apply, { userId, ...body });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
