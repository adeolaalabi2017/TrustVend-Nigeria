import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

/**
 * NextAuth configuration. Now that Convex is the data layer, the Credentials
 * provider delegates the email/password check to `api.users.verifyCredentials`
 * which runs in the Convex backend and returns the user (or null). The Convex
 * user id is what we put into the JWT.
 *
 * NOTE: This module is imported by both server code (route handlers) and
 * shared with `src/lib/convex-server.ts`. Keep the client lazy and side-effect
 * free so importing this file from a route doesn't open a Convex socket.
 */

let _convex: ConvexHttpClient | null = null;
function convex(): ConvexHttpClient {
  if (_convex) return _convex;
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url)
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set. Add it to .env.local."
    );
  _convex = new ConvexHttpClient(url);
  return _convex;
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/",
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    pkceCodeVerifier: {
      name: `next-auth.pkce.code_verifier`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    state: {
      name: `next-auth.state`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    nonce: {
      name: `next-auth.nonce`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        try {
          const user = await convex().query(api.users.verifyCredentials, {
            email,
            password: credentials.password,
          });
          if (!user) return null;
          return {
            id: user._id,
            email: user.email,
            name: user.name ?? undefined,
            image: user.image ?? undefined,
            role: user.role,
          } as any;
        } catch (err) {
          // Convex unavailable → treat as a hard auth failure rather than
          // throwing (NextAuth surfaces thrown errors to the user).
          console.error("Convex verifyCredentials failed:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
