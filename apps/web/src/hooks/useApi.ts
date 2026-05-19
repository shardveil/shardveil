"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { api } from "@/lib/api";

// ─── useApi ──────────────────────────────────────────────────────────────────

/**
 * Thin TanStack Query v5 wrapper around the `api()` helper.
 *
 * - `queryKey` defaults to `["api", path]`, but can be overridden via `options.queryKey`
 *   for compatibility with the `qk` factory (e.g., `qk.profile.me()`).
 * - `queryFn` calls `api<T>(path)` with the JWT attached automatically.
 * - All other `UseQueryOptions` (enabled, staleTime, select, …) can be
 *   forwarded via `options`.
 *
 * @example
 * // Default queryKey:
 * const { data, isLoading, error } = useApi<ProfileMe>("/profile/me");
 *
 * @example
 * // Custom queryKey for cache invalidation compatibility:
 * const { data } = useApi<ProfileMe>("/profile/me", { queryKey: qk.profile.me() });
 */
export function useApi<T>(
  path: string,
  options?: Omit<UseQueryOptions<T, Error>, "queryFn" | "queryKey"> & {
    queryKey?: UseQueryOptions<T, Error>["queryKey"];
  },
) {
  return useQuery<T>({
    queryKey: options?.queryKey ?? ["api", path],
    queryFn: () => api<T>(path),
    ...options,
  });
}
