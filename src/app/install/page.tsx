"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Mail,
  CreditCard,
  MessageSquare,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  Loader2,
  ExternalLink,
  Trash2,
  Copy,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FormData {
  // Email
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  // PayPal
  paypal_plan_starter_id: string;
  paypal_plan_growth_id: string;
  paypal_plan_business_id: string;
  paypal_webhook_id: string;
  // SMS
  sms_account_sid: string;
  sms_auth_token: string;
  sms_from_number: string;
  // AI
  ai_anthropic_api_key: string;
  // Platform
  support_email: string;
  trial_duration_days: string;
}

const INITIAL: FormData = {
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_password: "",
  smtp_from: "",
  paypal_plan_starter_id: "",
  paypal_plan_growth_id: "",
  paypal_plan_business_id: "",
  paypal_webhook_id: "",
  sms_account_sid: "",
  sms_auth_token: "",
  sms_from_number: "",
  ai_anthropic_api_key: "",
  support_email: "",
  trial_duration_days: "14",
};

// ── Step definitions ───────────────────────────────────────────────────────────

const STEPS = [
  { id: 0, label: "Pre-flight",  icon: ShieldCheck },
  { id: 1, label: "Email",       icon: Mail },
  { id: 2, label: "PayPal",      icon: CreditCard },
  { id: 3, label: "SMS & AI",    icon: MessageSquare },
  { id: 4, label: "Platform",    icon: Settings },
  { id: 5, label: "Complete",    icon: CheckCircle2 },
];

// ── Small helpers ──────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "number" | "url";
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
    />
  );
}

function SecretInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-3 pr-10 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function EnvBadge({
  varName,
  description,
  required,
}: {
  varName: string;
  description: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900 p-3">
      <div className="mt-0.5 flex-shrink-0">
        {required ? (
          <AlertTriangle className="h-4 w-4 text-amber-400" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        )}
      </div>
      <div>
        <code className="text-xs font-mono text-indigo-400">{varName}</code>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>
    </div>
  );
}

// ── Step content ───────────────────────────────────────────────────────────────

function StepPreflight() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Pre-flight Checklist</h2>
        <p className="mt-1 text-sm text-gray-400">
          Before running the wizard, make sure these environment variables are set in your
          hosting platform (Vercel → Settings → Environment Variables, or your{" "}
          <code className="text-xs text-indigo-400">.env.local</code> file for local dev).
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Required</p>
        <EnvBadge
          varName="MONGODB_URI"
          description="MongoDB connection string. The platform uses a /platform DB derived from this URI."
          required
        />
        <EnvBadge
          varName="NEXTAUTH_SECRET"
          description="Random 32-byte secret for signing session JWTs. Generate with: openssl rand -hex 32"
          required
        />
        <EnvBadge
          varName="SUPER_ADMIN_SECRET"
          description="Secret passphrase for the platform admin panel. Keep this safe — it grants full platform access."
          required
        />
        <EnvBadge
          varName="NEXT_PUBLIC_APP_DOMAIN"
          description="Root domain for tenant subdomains (e.g. tasksmgr.solutions). Sets admin.youromain.com routing."
          required
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Optional (Configured Later)</p>
        <EnvBadge
          varName="PAYPAL_CLIENT_ID"
          description="PayPal OAuth client ID. Required only if PayPal billing is enabled."
        />
        <EnvBadge
          varName="PAYPAL_CLIENT_SECRET"
          description="PayPal OAuth client secret."
        />
        <EnvBadge
          varName="PAYPAL_ENV"
          description='Set to "production" for live payments. Defaults to sandbox.'
        />
      </div>

      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4 text-sm text-indigo-300">
        <strong className="font-semibold">Tip:</strong> Integration credentials (SMTP passwords,
        Twilio tokens, Anthropic API key) will be stored securely in the platform database in the
        next steps — you do <em>not</em> need to add them as env vars.
      </div>
    </div>
  );
}

function StepEmail({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Email Service (SMTP)</h2>
        <p className="mt-1 text-sm text-gray-400">
          Used to send password-reset emails, notifications, and invitations to tenant users.
          Works with any SMTP provider (Gmail, SendGrid, Mailgun, Postmark, etc.).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Field label="SMTP Host" required hint='e.g. smtp.gmail.com or smtp.sendgrid.net'>
            <Input
              value={data.smtp_host}
              onChange={(v) => set("smtp_host", v)}
              placeholder="smtp.gmail.com"
            />
          </Field>
        </div>
        <Field label="Port" required hint="587 (TLS) or 465 (SSL)">
          <Input
            value={data.smtp_port}
            onChange={(v) => set("smtp_port", v)}
            placeholder="587"
            type="number"
          />
        </Field>
      </div>

      <Field label="Username / Email" required hint="The account used to authenticate with the SMTP server">
        <Input
          value={data.smtp_user}
          onChange={(v) => set("smtp_user", v)}
          placeholder="you@gmail.com"
          type="email"
        />
      </Field>

      <Field label="Password / App Password" required hint="Use an App Password if 2FA is enabled on Gmail">
        <SecretInput
          value={data.smtp_password}
          onChange={(v) => set("smtp_password", v)}
          placeholder="••••••••••••••"
        />
      </Field>

      <Field label="From Address" required hint='Sender shown in outgoing emails (e.g. "TasksMgr <noreply@domain.com>")'>
        <Input
          value={data.smtp_from}
          onChange={(v) => set("smtp_from", v)}
          placeholder="noreply@yourdomain.com"
          type="email"
        />
      </Field>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-xs text-gray-500">
        <strong className="text-gray-400">Gmail quick-start:</strong> Use{" "}
        <code>smtp.gmail.com</code> port <code>587</code>, your Gmail address as username, and
        generate an App Password under{" "}
        <a
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noreferrer"
          className="text-indigo-400 underline"
        >
          myaccount.google.com/apppasswords
        </a>
        .
      </div>
    </div>
  );
}

function StepPayPal({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">PayPal Integration</h2>
        <p className="mt-1 text-sm text-gray-400">
          Enter the PayPal Billing Plan IDs for each subscription tier. These are created in your
          PayPal Developer Dashboard and stored in the platform database. You can also configure
          this later via the admin panel.
        </p>
      </div>

      <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-300">
        <strong>Required env vars:</strong> <code>PAYPAL_CLIENT_ID</code>,{" "}
        <code>PAYPAL_CLIENT_SECRET</code>, and <code>PAYPAL_ENV</code> must be set before PayPal
        billing will work.
      </div>

      <Field
        label="Starter Plan ID"
        hint="PayPal Billing Plan ID for the Starter tier (e.g. P-XXXXXXXXX)"
      >
        <Input
          value={data.paypal_plan_starter_id}
          onChange={(v) => set("paypal_plan_starter_id", v)}
          placeholder="P-XXXXXXXXXXXXXXXXXX"
        />
      </Field>

      <Field
        label="Growth Plan ID"
        hint="PayPal Billing Plan ID for the Growth tier"
      >
        <Input
          value={data.paypal_plan_growth_id}
          onChange={(v) => set("paypal_plan_growth_id", v)}
          placeholder="P-XXXXXXXXXXXXXXXXXX"
        />
      </Field>

      <Field
        label="Business Plan ID"
        hint="PayPal Billing Plan ID for the Business tier"
      >
        <Input
          value={data.paypal_plan_business_id}
          onChange={(v) => set("paypal_plan_business_id", v)}
          placeholder="P-XXXXXXXXXXXXXXXXXX"
        />
      </Field>

      <Field
        label="Webhook ID"
        hint="Found in your PayPal Developer Dashboard under Webhooks"
      >
        <Input
          value={data.paypal_webhook_id}
          onChange={(v) => set("paypal_webhook_id", v)}
          placeholder="XXXXXXXXXXXXXXXXXX"
        />
      </Field>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-xs text-gray-500">
        You can use the <strong className="text-gray-400">Auto-Setup PayPal Plans</strong> button in
        the admin panel (<code>admin.yourdomain.com/admin/paypal</code>) to auto-create plans via the
        PayPal API after deployment. All fields here are optional for now.
      </div>
    </div>
  );
}

function StepSmsAi({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* SMS */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">SMS Service (Twilio)</h2>
          <p className="mt-1 text-sm text-gray-400">
            Optional. Used to send SMS notifications to field agents and clients. Requires a
            Twilio account at{" "}
            <a
              href="https://www.twilio.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 underline"
            >
              twilio.com
            </a>
            .
          </p>
        </div>

        <Field label="Account SID" hint="Found on your Twilio Console dashboard">
          <Input
            value={data.sms_account_sid}
            onChange={(v) => set("sms_account_sid", v)}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
        </Field>

        <Field label="Auth Token" hint="Secret token from your Twilio Console">
          <SecretInput
            value={data.sms_auth_token}
            onChange={(v) => set("sms_auth_token", v)}
            placeholder="••••••••••••••••••••••••••••••••"
          />
        </Field>

        <Field
          label="From Number"
          hint='Twilio phone number in E.164 format (e.g. +15551234567)'
        >
          <Input
            value={data.sms_from_number}
            onChange={(v) => set("sms_from_number", v)}
            placeholder="+15551234567"
          />
        </Field>
      </div>

      <hr className="border-gray-800" />

      {/* AI */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">AI Integration (Anthropic)</h2>
          <p className="mt-1 text-sm text-gray-400">
            Optional. Powers AI-generated daily field summaries and smart suggestions. Get your API
            key at{" "}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-400 underline"
            >
              console.anthropic.com
            </a>
            .
          </p>
        </div>

        <Field label="Anthropic API Key" hint="Starts with sk-ant-...">
          <SecretInput
            value={data.ai_anthropic_api_key}
            onChange={(v) => set("ai_anthropic_api_key", v)}
            placeholder="sk-ant-api03-..."
          />
        </Field>

        <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 text-xs text-gray-500">
          Enable AI features after install via the platform settings toggle{" "}
          <code>feature.ai_summaries</code> in the admin panel.
        </div>
      </div>
    </div>
  );
}

function StepPlatform({
  data,
  set,
}: {
  data: FormData;
  set: (k: keyof FormData, v: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Platform Settings</h2>
        <p className="mt-1 text-sm text-gray-400">
          Configure the default platform-wide settings. All of these can be changed at any time
          from the admin panel.
        </p>
      </div>

      <Field
        label="Support Email"
        hint="Shown to tenants for support inquiries"
      >
        <Input
          value={data.support_email}
          onChange={(v) => set("support_email", v)}
          placeholder="support@yourdomain.com"
          type="email"
        />
      </Field>

      <Field
        label="Trial Duration (days)"
        required
        hint="How many days new tenants get on the free trial plan"
      >
        <Input
          value={data.trial_duration_days}
          onChange={(v) => set("trial_duration_days", v)}
          placeholder="14"
          type="number"
        />
      </Field>

      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4 text-xs text-gray-500 space-y-1">
        <p>
          <strong className="text-gray-400">Feature flags</strong> (CRM module, field module, AI
          summaries, PayPal billing) can be toggled individually from the admin settings page after
          install.
        </p>
        <p>
          <strong className="text-gray-400">Plan limits</strong> (max users per tier) are also
          configurable in the admin settings.
        </p>
      </div>
    </div>
  );
}

function StepComplete({ appDomain }: { appDomain: string }) {
  const adminUrl = `https://admin.${appDomain}`;
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    navigator.clipboard.writeText(adminUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Setup Complete!</h2>
        <p className="mt-2 text-sm text-gray-400">
          Your platform is configured and ready. Here's what to do next.
        </p>
      </div>

      {/* Admin link */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-5 space-y-3">
        <p className="text-sm font-semibold text-indigo-300">Platform Admin Dashboard</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-mono text-white break-all">
            {adminUrl}
          </code>
          <button
            onClick={copyUrl}
            className="shrink-0 rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 hover:text-white transition-colors"
            title="Copy URL"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <a
            href={adminUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 hover:text-white transition-colors"
            title="Open admin"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
        <p className="text-xs text-indigo-400">
          Log in using your <code>SUPER_ADMIN_SECRET</code> env var when prompted.
        </p>
      </div>

      {/* Security hardening */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-amber-400 shrink-0" />
          <p className="text-sm font-semibold text-amber-300">Security Hardening — Do This Now</p>
        </div>
        <p className="text-sm text-amber-200/70">
          Remove the install wizard to prevent unauthorized reconfiguration. The{" "}
          <code>/api/install/complete</code> route already blocks re-runs, but deleting the files
          removes the attack surface entirely.
        </p>
        <div className="space-y-1.5 text-xs font-mono text-gray-400">
          <p className="text-gray-500">Files to delete:</p>
          <code className="block rounded bg-gray-900 px-2 py-1">src/app/install/</code>
          <code className="block rounded bg-gray-900 px-2 py-1">src/app/api/install/</code>
        </div>
        <p className="text-xs text-amber-200/60">
          After deleting, redeploy the application. The <code>install.completed</code> flag in the
          database ensures the wizard cannot run again even if the code is accidentally restored.
        </p>
      </div>

      {/* Next steps */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-300">Recommended Next Steps</p>
        <ul className="space-y-2 text-sm text-gray-400">
          {[
            "Register your first company at /register-company",
            "Configure PayPal billing plans in the admin panel → PayPal",
            "Adjust feature flags and plan limits in admin → Settings",
            "Test the email service by triggering a password reset",
            "Set up a cron job for /api/cron/* routes (see README)",
          ].map((step) => (
            <li key={step} className="flex items-start gap-2">
              <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-indigo-500" />
              {step}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main wizard ─────────────────────────────────────────────────────────────────

export default function InstallPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [alreadyDone, setAlreadyDone] = useState<boolean | null>(null);
  const [appDomain, setAppDomain] = useState("yourdomain.com");

  // Detect domain
  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      // Strip www. prefix
      setAppDomain(host.replace(/^www\./, ""));
    }
  }, []);

  // Check if already installed
  useEffect(() => {
    fetch("/api/install/status")
      .then((r) => r.json())
      .then((d: { completed: boolean }) => setAlreadyDone(d.completed))
      .catch(() => setAlreadyDone(false));
  }, []);

  function set(key: keyof FormData, value: string) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  function isLastContentStep() {
    return step === STEPS.length - 2; // step 4 = Platform, step 5 = Complete
  }

  async function handleNext() {
    if (isLastContentStep()) {
      // Submit
      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/install/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            smtp_port: parseInt(data.smtp_port) || 587,
            trial_duration_days: parseInt(data.trial_duration_days) || 14,
          }),
        });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(json.error ?? "Failed to save settings.");
          return;
        }
        setStep(STEPS.length - 1);
      } catch {
        setError("Network error. Make sure the application is running.");
      } finally {
        setSubmitting(false);
      }
    } else {
      setStep((s) => s + 1);
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (alreadyDone === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  // ── Already installed ────────────────────────────────────────────────────────
  if (alreadyDone) {
    const adminUrl = `https://admin.${appDomain}`;
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
        <div className="w-full max-w-md space-y-5 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
            <ShieldCheck className="h-7 w-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Already Installed</h1>
          <p className="text-sm text-gray-400">
            The platform setup has already been completed. For security, please remove the{" "}
            <code className="text-indigo-400">src/app/install/</code> and{" "}
            <code className="text-indigo-400">src/app/api/install/</code> directories and
            redeploy.
          </p>
          <a
            href={adminUrl}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Go to Admin Panel <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  // ── Wizard ───────────────────────────────────────────────────────────────────
  const isComplete = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Platform Setup Wizard</span>
          <span className="ml-auto text-xs text-gray-500">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </header>

      <div className="flex flex-1 mx-auto w-full max-w-3xl gap-8 p-6">
        {/* Sidebar progress */}
        <nav className="hidden w-44 shrink-0 sm:block">
          <ul className="space-y-1 sticky top-6">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const done = s.id < step;
              const current = s.id === step;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      if (s.id < step && !isComplete) setStep(s.id);
                    }}
                    disabled={s.id > step || isComplete}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      current
                        ? "bg-indigo-600/20 text-indigo-300 font-medium"
                        : done
                        ? "text-gray-400 hover:text-white cursor-pointer"
                        : "text-gray-600 cursor-not-allowed"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${done ? "text-emerald-500" : current ? "text-indigo-400" : ""}`} />
                    {s.label}
                    {done && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-500" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 md:p-8 space-y-6">
            {step === 0 && <StepPreflight />}
            {step === 1 && <StepEmail data={data} set={set} />}
            {step === 2 && <StepPayPal data={data} set={set} />}
            {step === 3 && <StepSmsAi data={data} set={set} />}
            {step === 4 && <StepPlatform data={data} set={set} />}
            {step === 5 && <StepComplete appDomain={appDomain} />}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Nav buttons */}
            {!isComplete && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <button
                  onClick={() => setStep((s) => s - 1)}
                  disabled={step === 0}
                  className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white disabled:opacity-0 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>

                <button
                  onClick={handleNext}
                  disabled={submitting}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                    </>
                  ) : isLastContentStep() ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> Complete Setup
                    </>
                  ) : (
                    <>
                      {step === 0 ? "Start Setup" : "Next"} <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
