import { NextResponse } from "next/server";
import { api, convexQuery } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const tag = url.searchParams.get("tag") ?? undefined;
  try {
    const result = await convexQuery(api.posts.list, {
      q,
      tag,
      onlyPublished: true,
      limit: 12,
    } as any);
    return NextResponse.json({
      posts: result.items,
      nextCursor: result.nextCursor,
    });
  } catch (err) {
    return NextResponse.json(
      { posts: [], error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
