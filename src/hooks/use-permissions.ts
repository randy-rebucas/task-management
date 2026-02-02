"use client";

import { useSession } from "next-auth/react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePermissions() {
  const { data: session } = useSession();

  const { data, isLoading } = useSWR(
    session ? "/api/users/me" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const permissions: Set<string> = new Set(data?.permissions || []);

  return {
    can: (permission: string) => permissions.has(permission),
    canAny: (perms: string[]) => perms.some((p) => permissions.has(p)),
    canAll: (perms: string[]) => perms.every((p) => permissions.has(p)),
    permissions,
    isLoading: isLoading && !!session,
  };
}
