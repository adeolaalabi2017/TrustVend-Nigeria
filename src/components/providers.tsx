"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const [convexClient] = useState(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null)
  );

  const tree = (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        {convexClient ? (
          <ConvexProvider client={convexClient}>{tree}</ConvexProvider>
        ) : (
          tree
        )}
      </ThemeProvider>
    </SessionProvider>
  );
}
