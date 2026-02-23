"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePermissions() {
  const { data: session, status } = useSession();
  // Only fetch if session is loaded and user is present
  const shouldFetch = status === "authenticated" && session?.user?.id;
  const { data, isLoading: swrLoading } = useSWR(
    shouldFetch ? "/api/users/me" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );
  const permissions: Set<string> = new Set(data?.permissions || []);

  return {
    can: (permission: string) => {
      if (permissions.has("*:*")) return true;
      return permissions.has(permission);
    },
    canAny: (perms: string[]) => {
      if (permissions.has("*:*")) return true;
      return perms.some((p) => permissions.has(p));
    },
    canAll: (perms: string[]) => {
      if (permissions.has("*:*")) return true;
      return perms.every((p) => permissions.has(p));
    },
    permissions,
    isLoading: status === "loading" || (!!shouldFetch && swrLoading),
  };
}