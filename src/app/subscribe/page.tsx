import Link from "next/link";
import { CheckCircle, Shield, Zap } from "lucide-react";
import { PLAN_CONFIG, PlanKey } from "@/lib/paypal";

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

const PLAN_HIGHLIGHT: Record<PlanKey, boolean> = {
  starter: false,
  growth: true,
  business: false,
};

const PLANS: PlanKey[] = ["starter", "growth", "business"];

export default function SubscribePage() {
  return (
    <div className="min-h-screen bg-[#080d1a] text-white flex flex-col items-center justify-center px-6 py-20 relative">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-white/50 mb-5">
            <Zap className="h-3 w-3 text-blue-400" />
            7-day free trial on all plans
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-white/45 text-lg max-w-xl mx-auto">
            Choose the plan that fits your team. Upgrade or cancel anytime.
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid sm:grid-cols-3 gap-5">
          {PLANS.map((key) => {
            const config = PLAN_CONFIG[key];
            const features = PLAN_FEATURES[key];
            const highlighted = PLAN_HIGHLIGHT[key];

            return (
              <div
                key={key}
                className={`relative flex flex-col rounded-2xl border p-7 transition-all ${
                  highlighted
                    ? "border-blue-500/50 bg-gradient-to-b from-blue-600/10 to-transparent"
                    : "border-white/[0.09] bg-white/[0.025]"
                }`}
              >
                {highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-[11px] font-bold tracking-wide uppercase">
                    Most Popular
                  </div>
                )}

                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">
                  {config.label}
                </p>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-extrabold">${config.amount}</span>
                  <span className="text-white/35 text-sm mb-1.5">/mo</span>
                </div>
                <p className="text-sm text-white/35 mb-6">
                  Up to {config.maxUsers} team members
                </p>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                      <CheckCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href={`/subscribe/${key}`}
                  className={`block w-full text-center rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    highlighted
                      ? "bg-blue-600 hover:bg-blue-500 text-white"
                      : "border border-white/15 hover:bg-white/10 text-white"
                  }`}
                >
                  Get started
                </Link>
              </div>
            );
          })}
        </div>

        {/* Trust line */}
        <div className="mt-12 flex items-center justify-center gap-2 text-xs text-white/25">
          <Shield className="h-3.5 w-3.5" />
          Secured & processed by PayPal · Cancel anytime · No hidden fees
        </div>

        <p className="mt-6 text-center text-sm text-white/30">
          Already have an account?{" "}
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 transition-colors">
            Go to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
