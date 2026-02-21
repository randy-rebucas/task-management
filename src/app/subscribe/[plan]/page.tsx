import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle, ArrowLeft, Shield } from "lucide-react";
import { PayPalSubscribeButton } from "@/components/pricing/paypal-subscribe-button";
import { PLAN_CONFIG, PlanKey, getStoredPlanIds } from "@/lib/paypal";

const PLAN_FEATURES: Record<PlanKey, string[]> = {
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
};

export default async function SubscribePage({
  params,
}: {
  params: Promise<{ plan: string }>;
}) {
  const { plan } = await params;
  const planKey = plan as PlanKey;

  if (!PLAN_CONFIG[planKey]) notFound();

  const [config, planIds] = await Promise.all([
    Promise.resolve(PLAN_CONFIG[planKey]),
    getStoredPlanIds(),
  ]);
  const planId = planIds[planKey];
  const features = PLAN_FEATURES[planKey];

  return (
    <div className="min-h-screen bg-[#080d1a] text-white flex items-center justify-center px-6 py-16 relative">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[350px] bg-violet-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-4xl">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to home
        </Link>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Plan summary */}
          <div className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-7">
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-1">
              {config.label} Plan
            </p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-5xl font-extrabold">${config.amount}</span>
              <span className="text-white/40 text-sm mb-2">/mo</span>
            </div>
            <p className="text-sm text-white/40 mb-1">Up to {config.maxUsers} team members</p>

            {/* Trial callout */}
            <div className="mt-4 mb-6 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
              <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-xs text-emerald-300 leading-relaxed">
                <span className="font-semibold">7-day free trial.</span>{" "}
                You won&apos;t be charged until the trial ends. Cancel anytime.
              </p>
            </div>

            <ul className="space-y-2.5">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                  <CheckCircle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Payment panel */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 to-violet-600/15 rounded-3xl blur-2xl -z-10" />
            <div className="rounded-2xl border border-white/[0.09] bg-[#0d1426]/90 backdrop-blur-sm p-7 h-full flex flex-col">
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-1">Start your free trial</h2>
                <p className="text-sm text-white/45">
                  Subscribe via PayPal. After approval you&apos;ll be redirected
                  to create your account.
                </p>
              </div>

              <div className="flex-1 flex flex-col justify-center">
                <PayPalSubscribeButton
                  planId={planId}
                  planKey={planKey}
                />
              </div>

              <div className="mt-6 pt-5 border-t border-white/[0.07]">
                <div className="flex items-center gap-2 text-xs text-white/30 justify-center">
                  <Shield className="h-3.5 w-3.5" />
                  Secured & processed by PayPal · Encrypted · Cancel anytime
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Already have account */}
        <p className="mt-8 text-center text-sm text-white/30">
          Already have an account?{" "}
          <Link href="/dashboard" className="text-blue-400 hover:text-blue-300 transition-colors">
            Go to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
