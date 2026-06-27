import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "VENDOR" | "ADMIN";
      email: string;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id: string;
    role: "CUSTOMER" | "VENDOR" | "ADMIN";
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "CUSTOMER" | "VENDOR" | "ADMIN";
  }
}
