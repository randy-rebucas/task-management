"use client";

import { useQuery } from "@tanstack/react-query";
import type { PlanInfo } from "@/app/api/plans/route";

export type { PlanInfo };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePlatformPlans() {
  const { data, isLoading } = useQuery<{ plans: PlanInfo[] }>({
    queryKey: ["/api/plans"],
    queryFn: () => fetcher("/api/plans"),
    refetchOnWindowFocus: false,
    staleTime: 300_000,
  });

  const plans = data?.plans ?? [];

  function getPlan(key: string): PlanInfo | undefined {
    return plans.find((p) => p.key === key);
  }

  return { plans, isLoading, getPlan };
}
