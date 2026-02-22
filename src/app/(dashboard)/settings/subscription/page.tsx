"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { mutate } from "swr";
import {
  Zap,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  CreditCard,
  Calendar,
  Users,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useSubscription } from "@/hooks/use-subscription";
import { usePlatformPlans } from "@/hooks/use-platform-plans";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ── Plan feature lists (display only — pricing/limits come from platform DB) ── */

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    "Up to 10 team members",
    "Task management & subtasks",
    "Basic dashboard & reports",
    "Email notifications",
    "5 GB file storage",
  ],
  growth: [
    "Up to 30 team members",
    "Everything in Starter",
    "CRM & deal pipeline",
    "KPI & performance tracking",
    "Field monitoring & GPS",
    "Proof of work submissions",
    "PDF & Excel exports",
    "Priority support",
  ],
  business: [
    "Up to 100 team members",
    "Everything in Growth",
    "Advanced role permissions",
    "Multi-department management",
    "Custom workflow builder",
    "50 GB storage",
    "Dedicated onboarding",
  ],
  enterprise: [
    "Unlimited members",
    "Everything in Business",
    "Custom integrations & API",
    "Dedicated account manager",
    "SLA guarantee",
    "On-premise option",
  ],
};

/* ── Status helpers ─────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  ACTIVE:           { label: "Active",           color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  APPROVED:         { label: "Active",           color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  APPROVAL_PENDING: { label: "Pending approval", color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",    icon: Clock },
  SUSPENDED:        { label: "Suspended",        color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20", icon: AlertTriangle },
  CANCELLED:        { label: "Cancelled",        color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",            icon: XCircle },
  EXPIRED:          { label: "Expired",          color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",            icon: XCircle },
};

function fmt(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/* ── Page ───────────────────────────────────────────────────── */

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription, isLoading, isActive, isTrialing, trialDaysLeft } =
    useSubscription();
  const { plans, isLoading: plansLoading, getPlan } = usePlatformPlans();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Show success toast when redirected back after PayPal approval
  useEffect(() => {
    if (searchParams.get("subscribed") === "1") {
      toast.success("Subscription activated! Welcome aboard 🎉");
      mutate("/api/subscriptions/status");
      // Clean URL without reloading
      const url = new URL(window.location.href);
      url.searchParams.delete("subscribed");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch("/api/subscriptions/cancel", { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Cancellation failed");
      }
      toast.success("Subscription cancelled. Access continues until the end of the current period.");
      mutate("/api/subscriptions/status");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCancelling(false);
      setCancelOpen(false);
    }
  }

  if (isLoading || plansLoading) {
    return (
      <div>
        <PageHeader title="Subscription" description="Manage your subscription and billing" />
        <div className="max-w-3xl space-y-6">
          <LoadingSkeleton />
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  /* No subscription */
  if (!subscription) {
    return (
      <div>
        <PageHeader title="Subscription" description="Manage your subscription and billing" />
        <div className="max-w-3xl">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
              <div className="rounded-full bg-muted p-4">
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-lg">No active subscription</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a plan to unlock the full platform.
                </p>
              </div>
              <Button asChild className="mt-2">
                <Link href="/settings/subscribe">
                  View plans <ArrowUpRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const planInfo = getPlan(subscription.plan);
  const plan = {
    label:    planInfo?.label    ?? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1),
    amount:   planInfo?.amount   ?? subscription.amount ?? 0,
    maxUsers: planInfo?.maxUsers ?? 0,
    features: PLAN_FEATURES[subscription.plan] ?? [],
  };

  const statusCfg = STATUS_CONFIG[subscription.status] ?? {
    label: subscription.status,
    color: "bg-muted text-muted-foreground border-border",
    icon: Clock,
  };
  const StatusIcon = statusCfg.icon;

  return (
    <div>
      <PageHeader
        title="Subscription"
        description="Manage your subscription and billing"
      />

      <div className="max-w-3xl space-y-6">
        {/* ── Current plan ── */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {plan.label} Plan
                </CardTitle>
                <CardDescription className="mt-1">
                  {subscription.plan !== "enterprise"
                    ? `$${plan.amount}/month · billed monthly`
                    : "Custom pricing · contact sales"}
                </CardDescription>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold border",
                  statusCfg.color
                )}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {statusCfg.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* Trial banner */}
            {isTrialing && trialDaysLeft !== null && (
              <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  <span className="font-semibold">Free trial:</span>{" "}
                  {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} remaining.
                  Your card will be charged after the trial ends.
                </p>
              </div>
            )}

            {/* Billing details grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Start date
                </p>
                <p className="text-sm font-medium">{fmt(subscription.startTime)}</p>
              </div>

              {subscription.trialEndTime && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> Trial ends
                  </p>
                  <p className="text-sm font-medium">{fmt(subscription.trialEndTime)}</p>
                </div>
              )}

              {subscription.nextBillingTime && !isTrialing && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <RefreshCw className="h-3.5 w-3.5" /> Next renewal
                  </p>
                  <p className="text-sm font-medium">{fmt(subscription.nextBillingTime)}</p>
                </div>
              )}

              {plan.maxUsers !== Infinity && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Team size
                  </p>
                  <p className="text-sm font-medium">Up to {plan.maxUsers} members</p>
                </div>
              )}

              {subscription.amount != null && subscription.plan !== "enterprise" && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" /> Amount
                  </p>
                  <p className="text-sm font-medium">${subscription.amount}/mo</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Plan features */}
            {plan.features.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Included in your plan
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Change plan ── */}
        {isActive && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Change plan</CardTitle>
              <CardDescription>
                Upgrade or switch to a different plan at any time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {plans.filter((p) => p.key !== "trial" && p.key !== "enterprise").map((p) => {
                  const isCurrent = subscription.plan === p.key;
                  return (
                    <div
                      key={p.key}
                      className={cn(
                        "rounded-xl border p-4 flex flex-col gap-2",
                        isCurrent
                          ? "border-primary/50 bg-primary/5"
                          : "bg-muted/30 hover:bg-muted/50 transition-colors"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{p.label}</span>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-[10px]">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xl font-bold">
                        ${p.amount}
                        <span className="text-xs font-normal text-muted-foreground">/mo</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Up to {p.maxUsers} members</p>
                      {!isCurrent && (
                        <Button asChild size="sm" variant="outline" className="mt-1 w-full">
                          <Link href={`/settings/subscribe/${p.key}`}>
                            Switch <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Danger zone ── */}
        {isActive && (
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Cancel subscription</CardTitle>
              <CardDescription>
                Your access continues until the end of the current billing period. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setCancelOpen(true)}
                disabled={cancelling}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Cancel subscription
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel subscription?"
        description="Your plan will remain active until the end of the current billing period. After that, your account will be downgraded and access to premium features will be removed."
        confirmLabel="Yes, cancel"
        onConfirm={handleCancel}
        destructive
      />
    </div>
  );
}
