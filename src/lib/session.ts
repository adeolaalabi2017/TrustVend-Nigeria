/**
 * Server-side session helpers.
 *
 * Resolves the current user from the NextAuth JWT, then re-validates their
 * account status against Convex (banned / deleted).  This ensures that a
 * banned user loses access immediately rather than waiting for the JWT expiry.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { convexServer } from "@/lib/convex-server";
import { api } from "convex/_generated/api";

export type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: "CUSTOMER" | "VENDOR" | "ADMIN";
};

async function getSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id ?? null;
}

/**
 * Returns the full current user if they are signed in and not banned/deleted.
 * Returns null in all other cases (not signed in, banned, deleted).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const id = await getSessionUserId();
  if (!id) return null;

  try {
    const result = await convexServer().query(api.users.getMe, { userId: id });
    if (!result) return null;
    return {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      image: result.user.image,
      role: result.user.role,
    };
  } catch {
    return null;
  }
}

/**
 * Returns the current user and their primary vendor (if any).
 */
export async function getCurrentUserWithVendor() {
  const id = await getSessionUserId();
  if (!id) return null;

  try {
    const result = await convexServer().query(api.users.getMe, { userId: id });
    if (!result) return null;
    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        image: result.user.image,
        role: result.user.role,
      },
      vendor: result.vendor,
    };
  } catch {
    return null;
  }
}
