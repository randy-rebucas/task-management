"use client";

import { useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/admin-shell";
import {
  Zap,
  CreditCard,
  RefreshCw,
  Save,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
} from "lucide-react";

interface PayPalConfig {
  starter:   { stored: string; env: string };
  growth:    { stored: string; env: string };
  business:  { stored: string; env: string };
  webhookId: string;
  env: "sandbox" | "production";
}

interface SetupResult {
  ok: boolean;
  productId?: string;
  starter?: string;
  growth?: string;
  business?: string;
}

function copy(value: string) {
  navigator.clipboard.writeText(value);
}

function PlanRow({
  label,
  stored,
  env,
  value,
  onChange,
}: {
  label: string;
  stored: string;
  env: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const active = stored || env;
  const source = stored ? "database" : env ? "env var" : null;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-200">{label}</label>
        {source && (
          <span className="text-[10px] text-gray-500">
            Active: <span className="font-semibold text-gray-400">{source}</span>
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={env || "P-XXXXXXXXXXXXXXXXXXXX"}
          className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-mono text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
        />
        {active && (
          <button
            type="button"
            onClick={() => copy(active)}
            title="Copy active ID"
            className="rounded-lg border border-gray-700 bg-gray-900 px-2.5 hover:bg-gray-800 transition-colors"
          >
            <Copy className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
      {env && stored && env !== stored && (
        <p className="text-xs text-amber-500">
          DB value overrides env var.
        </p>
      )}
    </div>
  );
}

export default function AdminPayPalPage() {
  const { apiFetch } = useAdmin();

  const [config, setConfig] = useState<PayPalConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    starter: "",
    growth: "",
    business: "",
    webhookId: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [running, setRunning] = useState(false);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);
  const [setupError, setSetupError] = useState("");

  // Load config
  useEffect(() => {
    apiFetch("/api/admin/paypal/config")
      .then((r) => r.json())
      .then((d: PayPalConfig) => {
        setConfig(d);
        setForm({
          starter:   d.starter.stored,
          growth:    d.growth.stored,
          business:  d.business.stored,
          webhookId: d.webhookId,
        });
      })
      .catch(() => setError("Failed to load PayPal configuration"))
      .finally(() => setLoading(false));
  }, [apiFetch]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await apiFetch("/api/admin/paypal/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // Refresh config
      const updated = await apiFetch("/api/admin/paypal/config").then((r) => r.json());
      setConfig(updated);
    } catch {
      setError("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetup() {
    setRunning(true);
    setSetupResult(null);
    setSetupError("");
    try {
      const res = await apiFetch("/api/admin/paypal/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Setup failed");
      setSetupResult(data as SetupResult);
      setForm((prev) => ({
        ...prev,
        starter:  data.starter  ?? prev.starter,
        growth:   data.growth   ?? prev.growth,
        business: data.business ?? prev.business,
      }));
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "PayPal setup failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-indigo-400" />
          PayPal Configuration
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage PayPal billing plan IDs and webhook settings for all tenants.
        </p>
      </div>

      {/* Environment banner */}
      {config && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
          config.env === "production"
            ? "border-emerald-500/20 bg-emerald-500/[0.07]"
            : "border-amber-500/20 bg-amber-500/[0.07]"
        }`}>
          {config.env === "production"
            ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          }
          <div className="flex-1 text-sm">
            <span className={`font-semibold ${config.env === "production" ? "text-emerald-400" : "text-amber-400"}`}>
              {config.env === "production" ? "Production" : "Sandbox"} mode
            </span>
            {config.env !== "production" && (
              <span className="text-gray-400 ml-1.5 text-xs">
                — Set <code className="bg-gray-800 px-1 rounded">PAYPAL_ENV=production</code> to switch.
              </span>
            )}
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            config.env === "production"
              ? "border-emerald-500/30 text-emerald-400"
              : "border-amber-500/30 text-amber-400"
          }`}>
            {config.env}
          </span>
        </div>
      )}

      {/* Auto-setup */}
      <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            Auto-Create PayPal Plans
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Creates a PayPal product + Starter, Growth, and Business billing plans with a 7-day
            free trial. Plan IDs are saved to the platform database automatically.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-3 text-xs text-gray-400 space-y-1">
            <p className="font-medium text-gray-300 mb-1.5">Prerequisites:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li><code className="bg-gray-700 px-1 rounded">PAYPAL_CLIENT_ID</code> set in environment</li>
              <li><code className="bg-gray-700 px-1 rounded">PAYPAL_CLIENT_SECRET</code> set in environment</li>
              <li><code className="bg-gray-700 px-1 rounded">PAYPAL_ENV</code> set to <code className="bg-gray-700 px-1 rounded">sandbox</code> or <code className="bg-gray-700 px-1 rounded">production</code></li>
            </ul>
          </div>

          <button
            onClick={handleSetup}
            disabled={running}
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {running
              ? <><RefreshCw className="h-4 w-4 animate-spin" /> Creating plans…</>
              : <><Zap className="h-4 w-4 text-indigo-400" /> Create PayPal Plans</>
            }
          </button>

          {setupError && (
            <p className="text-xs text-red-400 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">{setupError}</p>
          )}

          {setupResult?.ok && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" /> Plans created and saved
              </p>
              <div className="space-y-1 text-xs font-mono text-gray-400">
                {setupResult.productId && <p>Product: {setupResult.productId}</p>}
                {setupResult.starter  && <p>Starter:  {setupResult.starter}</p>}
                {setupResult.growth   && <p>Growth:   {setupResult.growth}</p>}
                {setupResult.business && <p>Business: {setupResult.business}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual config */}
      <div className="rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-400" />
            Plan IDs &amp; Webhook
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Values saved here override environment variables at runtime.
          </p>
        </div>

        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-9 rounded-lg bg-gray-800" />
            ))}
          </div>
        ) : error ? (
          <p className="p-6 text-sm text-red-400">{error}</p>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-5">
            <PlanRow
              label="Starter Plan ID  ($49/mo)"
              stored={config?.starter.stored ?? ""}
              env={config?.starter.env ?? ""}
              value={form.starter}
              onChange={(v) => setForm((p) => ({ ...p, starter: v }))}
            />
            <PlanRow
              label="Growth Plan ID  ($149/mo)"
              stored={config?.growth.stored ?? ""}
              env={config?.growth.env ?? ""}
              value={form.growth}
              onChange={(v) => setForm((p) => ({ ...p, growth: v }))}
            />
            <PlanRow
              label="Business Plan ID  ($299/mo)"
              stored={config?.business.stored ?? ""}
              env={config?.business.env ?? ""}
              value={form.business}
              onChange={(v) => setForm((p) => ({ ...p, business: v }))}
            />

            <hr className="border-gray-800" />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-200">Webhook ID</label>
                <a
                  href="https://developer.paypal.com/dashboard/applications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  PayPal Dashboard <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <input
                value={form.webhookId}
                onChange={(e) => setForm((p) => ({ ...p, webhookId: e.target.value }))}
                placeholder="Webhook ID from PayPal"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm font-mono text-white placeholder:text-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {saving
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Saving…</>
                : <><Save className="h-4 w-4" /> Save Configuration</>
              }
            </button>

            {saved && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Configuration saved
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
