"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PayPalScriptProvider,
  PayPalButtons,
  ReactPayPalScriptOptions,
} from "@paypal/react-paypal-js";
import { Loader2 } from "lucide-react";

interface PayPalSubscribeButtonProps {
  planId: string;         // PayPal plan ID (P-XXXX)
  planKey: string;        // e.g. "growth"
  email?: string;         // Pre-fill if user came from a form
  onSuccess?: () => void;
}

export function PayPalSubscribeButton({
  planId,
  planKey,
  email,
  onSuccess,
}: PayPalSubscribeButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  const scriptOptions: ReactPayPalScriptOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "",
    vault: true,
    intent: "subscription",
  };

  async function handleApprove(subscriptionId: string) {
    setActivating(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, plan: planKey, email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Activation failed");
      }

      onSuccess?.();
      // Redirect to register if no session, or dashboard if logged in
      router.push(`/register?plan=${planKey}&subscribed=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setActivating(false);
    }
  }

  if (!planId) {
    return (
      <div className="text-xs text-red-400 text-center py-2">
        PayPal plan not configured. Set PAYPAL_PLAN_{planKey.toUpperCase()}_ID in .env
      </div>
    );
  }

  return (
    <div className="w-full">
      {error && (
        <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400 text-center">
          {error}
        </div>
      )}

      {activating ? (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-white/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          Activating your subscription…
        </div>
      ) : (
        <PayPalScriptProvider options={scriptOptions}>
          <PayPalButtons
            style={{
              shape: "rect",
              color: "gold",
              layout: "vertical",
              label: "subscribe",
            }}
            createSubscription={(_data, actions) =>
              actions.subscription.create({ plan_id: planId })
            }
            onApprove={async (data) => {
              if (data.subscriptionID) {
                await handleApprove(data.subscriptionID);
              }
            }}
            onError={(err) => {
              console.error("PayPal error", err);
              setError("PayPal encountered an error. Please try again.");
            }}
            onCancel={() => setError(null)}
          />
        </PayPalScriptProvider>
      )}
    </div>
  );
}
