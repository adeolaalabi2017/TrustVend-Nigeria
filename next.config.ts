import type { NextConfig } from "next";

const rawHosts = process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "instagram.com,cdninstagram.com,fbcdn.net";

const hostPatterns: { protocol: "https" | "http"; hostname: string }[] = rawHosts
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean)
  .flatMap((h) => [
    { protocol: "https" as const, hostname: h },
    { protocol: "http" as const, hostname: h },
  ]);

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      ...hostPatterns,
      // Local dev
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
};

export default nextConfig;
