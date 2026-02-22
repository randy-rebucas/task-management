import { CheckCircle, Shield, Zap } from "lucide-react";
import { getPlatformDb } from "@/lib/platform-db";
import { getPlatformSettingModel } from "@/models/platform/PlatformSetting";
import { PageHeader } from "@/components/shared/page-header";
import Link from "next/link";
import { cn } from "@/lib/utils";

const PLAN_KEYS = ["starter", "growth", "business"] as const;
type PlanKey = (typeof PLAN_KEYS)[number];

const PLAN_DEFAULT_PRICES: Record<PlanKey, number> = {
  starter:  49,
  growth:   149,
  business: 299,
};

const PLAN_DEFAULT_LIMITS: Record<PlanKey, number> = {
  starter:  25,
  growth:   50,
  business: 150,
};

const PLAN_HIGHLIGHTED: Record<PlanKey, boolean> = {
  starter: false,
  growth: true,
  business: false,
};

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

interface PlanMeta {
  key: PlanKey;
  label: string;
  amount: number;
  maxUsers: number;
}

async function getPlansFromDb(): Promise<PlanMeta[]> {
  const pdb = await getPlatformDb();
  const Setting = getPlatformSettingModel(pdb);
  const rows = await Setting.find({
    key: {
      $in: [
        ...PLAN_KEYS.map((k) => `plan_label.${k}`),
        ...PLAN_KEYS.map((k) => `plan_price.${k}`),
        ...PLAN_KEYS.map((k) => `plan_limits.${k}`),
      ],
    },
  }).lean() as { key: string; value: unknown }[];

  const map: Record<string, unknown> = {};
  for (const r of rows) map[r.key] = r.value;

  return PLAN_KEYS.map((key) => ({
    key,
    label:    String(map[`plan_label.${key}`] ?? key.charAt(0).toUpperCase() + key.slice(1)),
    amount:   Number(map[`plan_price.${key}`]  ?? PLAN_DEFAULT_PRICES[key]),
    maxUsers: Number(map[`plan_limits.${key}`] ?? PLAN_DEFAULT_LIMITS[key]),
  }));
}

export default async function DashboardSubscribePage() {
  const plans = await getPlansFromDb();

  return (
    <div>
      <PageHeader
        title="Choose a Plan"
        description="Upgrade your workspace. All plans include a 7-day free trial."
      />

      <div className="max-w-5xl">
        {/* Trial badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-xs text-blue-400 mb-8">
          <Zap className="h-3 w-3" />
          7-day free trial on all plans — no charge until trial ends
        </div>

        {/* Plans grid */}
        <div className="grid sm:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const highlighted = PLAN_HIGHLIGHTED[plan.key];
            const features = PLAN_FEATURES[plan.key];

            return (
              <div
                key={plan.key}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-7 transition-all",
                  highlighted
                    ? "border-primary/50 bg-primary/[0.04]"
                    : "border-border bg-card"
                )}
              >
                {highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[11px] font-bold tracking-wide uppercase">
                    Most Popular
                  </div>
                )}

                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  {plan.label}
                </p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold">${plan.amount}</span>
                  <span className="text-muted-foreground text-sm mb-1.5">/mo</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Up to {plan.maxUsers} team members
                </p>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/settings/subscribe/${plan.key}`}
                  className={cn(
                    "block w-full text-center rounded-xl py-2.5 text-sm font-semibold transition-colors",
                    highlighted
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-border hover:bg-muted text-foreground"
                  )}
                >
                  Get started
                </Link>
              </div>
            );
          })}
        </div>

        {/* Trust line */}
        <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          Secured &amp; processed by PayPal · Cancel anytime · No hidden fees
        </div>
      </div>
    </div>
  );
}
