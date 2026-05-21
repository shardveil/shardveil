// Note: This provider will be composed into AppProvider in Task 5.13.
// Web3Provider (WagmiProvider) requires QueryClientProvider above it in the tree —
// mount QueryProvider as the outermost provider in AppProvider.
"use client";

import {
  type DehydratedState,
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { type ReactNode, useState } from "react";

interface QueryProviderProps {
  children: ReactNode;
  /** Optional dehydrated state from server-side prefetching via Next.js server components. */
  dehydratedState?: DehydratedState;
}

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000, // 30 seconds
        gcTime: 5 * 60_000, // 5 minutes
        refetchOnWindowFocus: false, // chat/notification queries can override individually
        retry: 1,
      },
    },
  });
}

/**
 * QueryProvider sets up TanStack Query v5 for the ShardVeil web app.
 *
 * - `QueryClient` is created once per render tree via `useState` (required for App Router).
 * - `HydrationBoundary` enables SSR prefetch hydration from server components.
 * - `ReactQueryDevtools` is mounted only in development.
 */
// Wired into the root layout via AppProvider (see apps/web/src/providers/AppProvider.tsx — Task 5.13)
export function QueryProvider({
  children,
  dehydratedState,
}: QueryProviderProps) {
  // useState ensures the QueryClient is created once and remains stable across re-renders.
  // Do NOT use useMemo — it can be discarded by React, causing subtle cache bugs.
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
