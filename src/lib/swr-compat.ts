/**
 * Drop-in useSWR shim backed by TanStack Query.
 *
 * This lets us remove the `swr` package without touching every call-site.
 * Components can continue using the `useSWR(url, fetcher, options)` signature
 * while benefiting from the shared TanStack Query cache.
 *
 * Supported options (mapped from SWR → TanStack Query):
 *   revalidateOnFocus   → refetchOnWindowFocus
 *   dedupingInterval    → staleTime
 *   fallbackData        → initialData / placeholderData
 *   refreshInterval     → refetchInterval
 *   revalidateOnMount   → (handled via enabled + refetchOnMount)
 *
 * The returned `mutate(newData?, { revalidate? })` mirrors SWR's mutate:
 *   - called with no args  → invalidates + refetches
 *   - called with data     → optimistic cache update (+ optional refetch)
 */
"use client";

import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";

type Key = string | null | undefined | (() => string | null | undefined);

interface SWROptions<T> {
  revalidateOnFocus?: boolean;
  revalidateOnMount?: boolean;
  dedupingInterval?: number;
  refreshInterval?: number;
  fallbackData?: T;
  /** Passed through to TanStack Query for advanced use. */
  queryOptions?: Partial<UseQueryOptions<T>>;
}

interface SWRResponse<T> {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (
    newData?: T | ((current: T | undefined) => T | undefined),
    options?: { revalidate?: boolean }
  ) => void;
}

export default function useSWR<T = unknown>(
  key: Key,
  fetcher: (url: string) => Promise<T>,
  options?: SWROptions<T>
): SWRResponse<T> {
  const resolvedKey = typeof key === "function" ? key() : key;
  const queryClient = useQueryClient();

  const queryKey = resolvedKey ? [resolvedKey] : ([] as unknown[]);

  const { data, error, isLoading, isFetching, refetch } = useQuery<T>({
    queryKey,
    // TanStack Query v5 forbids queryFn returning `undefined`; coerce to null.
    queryFn: async () => {
      const result = await fetcher(resolvedKey!);
      return (result ?? null) as T;
    },
    enabled: resolvedKey != null && resolvedKey !== "",
    refetchOnWindowFocus: options?.revalidateOnFocus ?? true,
    refetchOnMount: options?.revalidateOnMount ?? true,
    staleTime: options?.dedupingInterval,
    refetchInterval: options?.refreshInterval,
    // Only pass initialData when explicitly provided (undefined would be ignored
    // by TanStack Query, but omitting it keeps the types clean).
    ...(options?.fallbackData !== undefined && { initialData: options.fallbackData }),
    ...options?.queryOptions,
  });

  const mutate = (
    newData?: T | ((current: T | undefined) => T | undefined),
    opts?: { revalidate?: boolean }
  ) => {
    if (newData !== undefined) {
      if (typeof newData === "function") {
        const updater = newData as (current: T | undefined) => T | undefined;
        queryClient.setQueryData<T>(queryKey, (old) => updater(old));
      } else {
        queryClient.setQueryData<T>(queryKey, newData);
      }
    }

    const shouldRevalidate = opts?.revalidate !== false;
    if (shouldRevalidate || newData === undefined) {
      void refetch();
    }
  };

  // Coerce null → undefined so that SWR-style destructuring defaults
  // (e.g. `data: items = []`) still work. TanStack Query v5 stores null
  // internally (undefined is forbidden by its strict check), but consumers
  // of this shim expect undefined when there is no data yet.
  return { data: (data ?? undefined) as T | undefined, error, isLoading, isValidating: isFetching, mutate };
}
