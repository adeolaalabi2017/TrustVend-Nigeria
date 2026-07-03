import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { convexServer } from "@/lib/convex-server";
import { api } from "convex/_generated/api";

/**
 * One-shot bootstrap endpoint that promotes the signed-in user to ADMIN
 * role IF (and only if) BOOTSTRAP_ADMIN_EMAIL is set on the Convex backend
 * AND the user's email matches.
 *
 * After calling this once successfully, remove BOOTSTRAP_ADMIN_EMAIL
 * from the Convex backend env to disable this escape hatch.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const email = session.user.email;
  if (!userId || !email) {
    return NextResponse.json(
      { error: "Missing session user ID or email" },
      { status: 400 }
    );
  }

  try {
    const result = await convexServer().mutation(api.users.bootstrapPromoteSelf, {
      userId,
      email,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Bootstrap promotion failed" },
      { status: 400 }
    );
  }
}
