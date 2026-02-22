"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PayPalScriptProvider,
  PayPalButtons,
  ReactPayPalScriptOptions,
} from "@paypal/react-paypal-js";
import { Loader2, Mail, ArrowRight } from "lucide-react";

interface PayPalSubscribeButtonProps {
  planId: string;         // PayPal plan ID (P-XXXX)
  planKey: string;        // e.g. "growth"
  email?: string;         // Pre-fill if user is already logged in
  onSuccess?: () => void;
}

export function PayPalSubscribeButton({
  planId,
  planKey,
  email: propEmail,
  onSuccess,
}: PayPalSubscribeButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);

  // Guest email capture — only needed when no email is provided via session/prop
  const [guestEmail, setGuestEmail] = useState("");
  const [emailConfirmed, setEmailConfirmed] = useState(!!propEmail);

  const resolvedEmail = propEmail ?? (emailConfirmed ? guestEmail : "");

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
        body: JSON.stringify({ subscriptionId, plan: planKey, email: resolvedEmail }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Activation failed");
      }

      onSuccess?.();
      const emailParam = resolvedEmail ? `&email=${encodeURIComponent(resolvedEmail)}` : "";
      router.push(`/register?plan=${planKey}&subscribed=1${emailParam}`);
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
    <div className="w-full space-y-4">
      {/* ── Step 1: Collect guest email ── */}
      {!emailConfirmed && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (guestEmail) setEmailConfirmed(true);
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-white/65 mb-1.5">
              Your email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
              />
            </div>
            <p className="mt-1.5 text-xs text-white/30">
              We&apos;ll use this to link your subscription when you create your account.
            </p>
          </div>
          <button
            type="submit"
            disabled={!guestEmail}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            Continue to payment
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* ── Step 2: PayPal button (shown after email confirmed) ── */}
      {emailConfirmed && (
        <>
          {/* Show confirmed email with option to change */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm">
            <span className="text-white/50 truncate">{resolvedEmail}</span>
            {!propEmail && (
              <button
                type="button"
                onClick={() => { setEmailConfirmed(false); setError(null); }}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors ml-3 shrink-0"
              >
                Change
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400 text-center">
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
        </>
      )}
    </div>
  );
}
