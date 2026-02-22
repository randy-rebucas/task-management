"use client";

import { useState } from "react";
import { mutate } from "swr";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  RefreshCw,
  ArrowUpRight,
  ShieldOff,
  Zap,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useSubscription } from "@/hooks/use-subscription";
import { PLAN_DISPLAY, PlanKey } from "@/config/plans";
import Link from "next/link";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  ACTIVE:           { label: "Active",           icon: CheckCircle,  className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" },
  APPROVED:         { label: "Active",           icon: CheckCircle,  className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" },
  APPROVAL_PENDING: { label: "Pending Approval", icon: Clock,        className: "border-amber-500/20 bg-amber-500/10 text-amber-500" },
  SUSPENDED:        { label: "Suspended",        icon: ShieldOff,    className: "border-orange-500/20 bg-orange-500/10 text-orange-500" },
  CANCELLED:        { label: "Cancelled",        icon: XCircle,      className: "border-red-500/20 bg-red-500/10 text-red-500" },
  EXPIRED:          { label: "Expired",          icon: XCircle,      className: "border-red-500/20 bg-red-500/10 text-red-500" },
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Free Trial",
  starter: "Starter",
  growth: "Growth",
  business: "Business",
  enterprise: "Enterprise",
};

export default function BillingPage() {
  const { subscription, isLoading, isOwner, isActive, isTrialing, trialDaysLeft } = useSubscription();
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your subscription? Your access will continue until the end of the billing period.")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/subscriptions/cancel", { method: "POST" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to cancel");
      }
      toast.success("Subscription cancelled successfully");
      mutate("/api/subscriptions/status");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  }

  const statusCfg = subscription ? (STATUS_CONFIG[subscription.status] ?? STATUS_CONFIG.ACTIVE) : null;
  const planConfig = subscription?.plan && subscription.plan !== "enterprise"
    ? PLAN_DISPLAY[subscription.plan as PlanKey]
    : null;

  return (
    <div>
      <PageHeader
        title="Billing & Subscription"
        description="Manage your workspace plan and billing"
      />

      <div className="max-w-2xl space-y-5">
        {isLoading ? (
          <Card><CardContent className="py-6"><LoadingSkeleton /></CardContent></Card>
        ) : !subscription ? (
          // ── No subscription ──────────────────────────────────────────────────
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                No Active Subscription
              </CardTitle>
              <CardDescription>
                Your workspace is currently on the free trial. Subscribe to unlock full access.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/subscribe">
                <Button>
                  <Zap className="mr-2 h-4 w-4" />
                  View Plans & Subscribe
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          // ── Active subscription ───────────────────────────────────────────────
          <>
            {/* Trial Warning */}
            {isTrialing && trialDaysLeft !== null && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    {trialDaysLeft} day{trialDaysLeft !== 1 ? "s" : ""} left in your free trial.
                  </span>
                  <span className="text-muted-foreground ml-1.5">
                    Your subscription will begin automatically when the trial ends.
                  </span>
                </div>
              </div>
            )}

            {/* Subscription Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">
                      {PLAN_LABELS[subscription.plan] ?? subscription.plan} Plan
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {planConfig
                        ? `$${planConfig.amount}/month · up to ${planConfig.maxUsers} team members`
                        : "Enterprise plan"}
                    </CardDescription>
                  </div>
                  {statusCfg && (
                    <Badge
                      variant="outline"
                      className={cn("shrink-0 gap-1.5 text-xs font-semibold", statusCfg.className)}
                    >
                      <statusCfg.icon className="h-3 w-3" />
                      {statusCfg.label}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="pt-4 space-y-3">
                {subscription.startTime && (
                  <Row label="Start Date">
                    {new Date(subscription.startTime).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </Row>
                )}
                {isTrialing && subscription.trialEndTime && (
                  <Row label="Trial Ends">
                    <span className="text-amber-500 font-medium">
                      {new Date(subscription.trialEndTime).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </span>
                  </Row>
                )}
                {!isTrialing && subscription.nextBillingTime && isActive && (
                  <Row label="Next Billing Date">
                    {new Date(subscription.nextBillingTime).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </Row>
                )}
                {planConfig && (
                  <Row label="Amount">
                    ${planConfig.amount} / month
                  </Row>
                )}
              </CardContent>
            </Card>

            {/* Owner actions */}
            {isOwner && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Manage Subscription</CardTitle>
                  <CardDescription>Upgrade your plan or cancel your subscription.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                  <Link href="/subscribe">
                    <Button variant="outline">
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Change Plan
                    </Button>
                  </Link>

                  {isActive && (
                    <Button
                      variant="outline"
                      className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={handleCancel}
                      disabled={cancelling}
                    >
                      {cancelling
                        ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Cancelling…</>
                        : <><XCircle className="mr-2 h-4 w-4" /> Cancel Subscription</>
                      }
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Non-owner notice */}
            {!isOwner && (
              <p className="text-sm text-muted-foreground">
                Only the account owner can manage the subscription.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
