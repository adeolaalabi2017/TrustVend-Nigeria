import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
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
        className={`${jakartaSans.variable} font-sans antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <SonnerToaster richColors position="top-center" />
      </body>
    </html>
  );
}
