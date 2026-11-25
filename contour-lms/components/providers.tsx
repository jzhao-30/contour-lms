"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/** TanStack Query: caching, loading state and refetching after mutations. */
export function Providers({ children }: { children: React.ReactNode }) {
  // per-session client, not a module-level one shared across server renders
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // fresh for 30s
            // don't retry 4xx, it won't help
            retry: (count, error) => {
              const status = (error as { status?: number }).status ?? 500;
              return status >= 500 && count < 2;
            },
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
