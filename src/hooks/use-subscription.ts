"use client";

import useSWR from "swr";

export interface SubscriptionInfo {
  id: string;
  plan: "starter" | "growth" | "business" | "enterprise";
  status: "APPROVAL_PENDING" | "APPROVED" | "ACTIVE" | "SUSPENDED" | "CANCELLED" | "EXPIRED";
  amount: number;
  nextBillingTime?: string;
  trialEndTime?: string;
  startTime?: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSubscription() {
  const { data, isLoading } = useSWR<{ subscription: SubscriptionInfo | null; isOwner: boolean }>(
    "/api/subscriptions/status",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const subscription = data?.subscription ?? null;
  // Default to false during loading — avoids flashing owner-only controls to staff
  const isOwner = data ? data.isOwner : false;

  const isActive =
    subscription?.status === "ACTIVE" || subscription?.status === "APPROVED";

  const isTrialing =
    isActive &&
    subscription?.trialEndTime != null &&
    new Date(subscription.trialEndTime) > new Date();

  const trialDaysLeft = isTrialing
    ? Math.ceil(
        (new Date(subscription!.trialEndTime!).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return { subscription, isLoading, isOwner, isActive, isTrialing, trialDaysLeft };
}
