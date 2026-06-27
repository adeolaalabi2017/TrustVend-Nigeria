import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrustVend Nigeria — Find Trusted Instagram Vendors",
  description:
    "Discover, verify, and engage with trusted Instagram businesses and vendors across Nigeria. Browse by category and location, read reviews, and connect with confidence.",
  keywords: [
    "Nigeria vendors",
    "Instagram businesses",
    "trusted vendors Nigeria",
    "TrustVend",
    "Nigerian marketplace",
    "vendor directory",
  ],
  authors: [{ name: "TrustVend Nigeria" }],
  openGraph: {
    title: "TrustVend Nigeria",
    description: "Find trusted Instagram vendors across Nigeria.",
    siteName: "TrustVend Nigeria",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <SonnerToaster richColors position="top-center" />
      </body>
    </html>
  );
}
