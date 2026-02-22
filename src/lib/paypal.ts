const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

export const PLAN_CONFIG = {
  starter: {
    planId: process.env.PAYPAL_PLAN_STARTER_ID ?? "",
    amount: 49,
    label: "Starter",
    maxUsers: 10,
  },
  growth: {
    planId: process.env.PAYPAL_PLAN_GROWTH_ID ?? "",
    amount: 149,
    label: "Growth",
    maxUsers: 30,
  },
  business: {
    planId: process.env.PAYPAL_PLAN_BUSINESS_ID ?? "",
    amount: 299,
    label: "Business",
    maxUsers: 100,
  },
} as const;

export type PlanKey = keyof typeof PLAN_CONFIG;

/**
 * Returns plan IDs sourced from the platform config (DB-first, env var fallback).
 */
export async function getStoredPlanIds(): Promise<Record<PlanKey, string>> {
  const { getPlatformConfig } = await import("@/lib/platform-config");
  const { paypal } = await getPlatformConfig();
  return {
    starter:  paypal.planStarterId  || PLAN_CONFIG.starter.planId,
    growth:   paypal.planGrowthId   || PLAN_CONFIG.growth.planId,
    business: paypal.planBusinessId || PLAN_CONFIG.business.planId,
  };
}

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  return data.access_token as string;
}

export async function getSubscriptionDetails(subscriptionId: string) {
  const token = await getPayPalAccessToken();
  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return res.json();
}

export async function cancelPayPalSubscription(
  subscriptionId: string,
  reason: string
): Promise<boolean> {
  const token = await getPayPalAccessToken();
  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason }),
    }
  );
  return res.status === 204;
}

export async function verifyWebhookSignature(
  headers: Record<string, string>,
  rawBody: string
): Promise<boolean> {
  const token = await getPayPalAccessToken();

  // Prefer webhook ID from platform config (DB-first, env var fallback)
  const { getPlatformConfig } = await import("@/lib/platform-config");
  const { paypal: paypalCfg } = await getPlatformConfig();
  const webhookId = paypalCfg.webhookId || process.env.PAYPAL_WEBHOOK_ID || "";

  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        client_id: process.env.PAYPAL_CLIENT_ID,
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    }
  );
  const result = await res.json();
  return result.verification_status === "SUCCESS";
}
