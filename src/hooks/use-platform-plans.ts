"use client";

import useSWR from "swr";
import type { PlanInfo } from "@/app/api/plans/route";

export type { PlanInfo };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePlatformPlans() {
  const { data, isLoading } = useSWR<{ plans: PlanInfo[] }>(
    "/api/plans",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300_000 }
  );

  const plans = data?.plans ?? [];

  function getPlan(key: string): PlanInfo | undefined {
    return plans.find((p) => p.key === key);
  }

  return { plans, isLoading, getPlan };
}
