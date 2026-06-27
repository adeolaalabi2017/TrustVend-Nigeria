import { NextResponse } from "next/server";
import { api, convexMutate, requireUserId } from "@/lib/convex-server";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  try {
    const result = await convexMutate(api.users.changePassword, {
      userId,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  const userId = await requireUserId().catch(() => null);
  if (!userId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    const result = await convexMutate(api.users.deleteAccount, { userId });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 400 }
    );
  }
}
