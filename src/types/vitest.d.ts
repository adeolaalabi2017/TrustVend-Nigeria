/// <reference types="vitest" />
import type { SessionUser } from "@/lib/session";

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
}
