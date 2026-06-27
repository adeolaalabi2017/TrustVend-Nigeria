import { NextResponse } from "next/server";
import { api, convexMutate, convexQuery, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const thread = await convexQuery(api.threads.get, {
      threadId: params.id,
      userId,
    });
    // Mark incoming messages read.
    await convexMutate(api.threads.markRead, { userId, threadId: params.id });
    return NextResponse.json(thread);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
