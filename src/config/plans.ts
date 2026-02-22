/**
 * Plan display constants that are safe to use in both client and server components.
 * Does NOT include plan IDs (those are server-side env vars – see lib/paypal.ts).
 */
export const PLAN_DISPLAY = {
  starter: {
    amount: 49,
    label: "Starter",
    maxUsers: 10,
  },
  growth: {
    amount: 149,
    label: "Growth",
    maxUsers: 30,
  },
  business: {
    amount: 299,
    label: "Business",
    maxUsers: 100,
  },
} as const;

export type PlanKey = keyof typeof PLAN_DISPLAY;
