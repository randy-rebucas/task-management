import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle, Shield } from "lucide-react";
import { PayPalSubscribeButton } from "@/components/pricing/paypal-subscribe-button";
import { getStoredPlanIds, PLAN_CONFIG, PlanKey } from "@/lib/paypal";
import { getPlatformDb } from "@/lib/platform-db";
import { getPlatformSettingModel } from "@/models/platform/PlatformSetting";
import { auth } from "@/lib/auth";

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  starter: [
    "Task management with subtasks & dependencies",
    "Comments, attachments & time logging",
    "My Tasks, Calendar & Notifications",
    "Basic dashboard & activity log",
    "Email & in-app notifications",
    "Role-based access control",
  ],
  growth: [
    "Everything in Starter",
    "CRM — leads, clients & deal pipeline",
    "KPI tracking & performance targets",
    "Field monitoring with GPS check-in/out",
    "Visit logs & proof of work submissions",
    "Reports with PDF & Excel export",
    "Analytics & department management",
    "Priority support",
  ],
  business: [
    "Everything in Growth",
    "Custom workflow builder (statuses & transitions)",
    "Advanced multi-role permissions",
    "Notification automation rules",
    "Workflow & escalation automation",
    "Full audit & activity log access",
    "Dedicated onboarding",
  ],
};

async function getPlanDisplay(planKey: PlanKey) {
  const pdb = await getPlatformDb();
  const Setting = getPlatformSettingModel(pdb);
  const keys = [`plan_label.${planKey}`, `plan_price.${planKey}`, `plan_limits.${planKey}`];
  const rows = await Setting.find({ key: { $in: keys } }).lean() as { key: string; value: unknown }[];
  const map: Record<string, unknown> = {};
  for (const r of rows) map[r.key] = r.value;
  const fallback = PLAN_CONFIG[planKey];
  return {
    label:    String(map[`plan_label.${planKey}`]  ?? fallback.label),
    amount:   Number(map[`plan_price.${planKey}`]  ?? fallback.amount),
    maxUsers: Number(map[`plan_limits.${planKey}`] ?? fallback.maxUsers),
  };
}

export default async function DashboardSubscribeCheckoutPage({
  params,
}: {
  params: Promise<{ plan: string }>;
}) {
  const { plan } = await params;
  const planKey = plan as PlanKey;

  if (!PLAN_CONFIG[planKey]) notFound();

  const session = await auth();
  if (!session?.user) redirect("/login");

  const [planDisplay, planIds] = await Promise.all([
    getPlanDisplay(planKey),
    getStoredPlanIds(),
  ]);

  const planId = planIds[planKey];
  const features = PLAN_FEATURES[planKey];
  const email = session.user.email ?? undefined;

  return (
    <div className="max-w-4xl">
      {/* Back link */}
      <Link
        href="/settings/subscribe"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to plans
      </Link>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Plan summary */}
        <div className="rounded-2xl border border-border bg-card p-7">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
            {planDisplay.label} Plan
          </p>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-5xl font-extrabold">${planDisplay.amount}</span>
            <span className="text-muted-foreground text-sm mb-2">/mo</span>
          </div>
          <p className="text-sm text-muted-foreground mb-1">
            Up to {planDisplay.maxUsers} team members
          </p>

          {/* Trial callout */}
          <div className="mt-4 mb-6 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
            <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
              <span className="font-semibold">7-day free trial.</span>{" "}
              You won&apos;t be charged until the trial ends. Cancel anytime.
            </p>
          </div>

          <ul className="space-y-2.5">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Payment panel */}
        <div className="rounded-2xl border border-border bg-card p-7 flex flex-col">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-1">Start your free trial</h2>
            <p className="text-sm text-muted-foreground">
              Subscribe with your PayPal account. You&apos;re signed in as{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <PayPalSubscribeButton
              planId={planId}
              planKey={planKey}
              email={email}
              successRedirect="/settings/subscription?subscribed=1"
            />
          </div>

          <div className="mt-6 pt-5 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
              <Shield className="h-3.5 w-3.5" />
              Secured &amp; processed by PayPal · Encrypted · Cancel anytime
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
