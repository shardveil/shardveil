"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { api } from "@/lib/api";

// ─── useApi ──────────────────────────────────────────────────────────────────

/**
 * Thin TanStack Query v5 wrapper around the `api()` helper.
 *
 * - `queryKey` is automatically set to `["api", path]`.
 * - `queryFn` calls `api<T>(path)` with the JWT attached automatically.
 * - All other `UseQueryOptions` (enabled, staleTime, select, …) can be
 *   forwarded via `options`.
 *
 * @example
 * const { data, isLoading, error } = useApi<ProfileMe>("/profile/me");
 */
export function useApi<T>(
  path: string,
  options?: Omit<UseQueryOptions<T>, "queryFn" | "queryKey">,
) {
  return useQuery<T>({
    queryKey: ["api", path],
    queryFn: () => api<T>(path),
    ...options,
  });
}
