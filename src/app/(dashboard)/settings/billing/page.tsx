"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { toast } from "sonner";
import {
  CreditCard,
  Zap,
  RefreshCw,
  Save,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { usePermissions } from "@/features/auth/use-permissions";
import { cn } from "@/lib/utils";

interface PayPalConfig {
  starter:   { stored: string; env: string };
  growth:    { stored: string; env: string };
  business:  { stored: string; env: string };
  productId: string;
  webhookId: string;
  env: "sandbox" | "production";
}

interface SetupResult {
  ok: boolean;
  productId: string;
  starter: string;
  growth: string;
  business: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function PlanIdField({
  label,
  stored,
  env,
  value,
  onChange,
  disabled,
}: {
  label: string;
  stored: string;
  env: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const active = stored || env;
  const source = stored ? "database" : env ? "env var" : null;

  function copy() {
    navigator.clipboard.writeText(active);
    toast.success("Copied to clipboard");
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {source && (
          <span className="text-[10px] text-muted-foreground">
            Active source: <span className="font-semibold">{source}</span>
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={env || "P-XXXXXXXXXXXXXXXXXXXX"}
          disabled={disabled}
          className="font-mono text-sm"
        />
        {active && (
          <Button variant="outline" size="icon" onClick={copy} type="button" title="Copy active ID">
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
      {env && stored && env !== stored && (
        <p className="text-xs text-amber-500">
          DB value overrides env var. Remove to fall back to env var.
        </p>
      )}
    </div>
  );
}

export default function BillingSettingsPage() {
  const { can } = usePermissions();
  const { data, isLoading } = useSWR<PayPalConfig>("/api/admin/paypal/config", fetcher);

  const [form, setForm] = useState({
    starter: "",
    growth: "",
    business: "",
    productId: "",
    webhookId: "",
  });
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [setupResult, setSetupResult] = useState<SetupResult | null>(null);

  useEffect(() => {
    if (data) {
      setForm({
        starter:   data.starter.stored,
        growth:    data.growth.stored,
        business:  data.business.stored,
        productId: data.productId,
        webhookId: data.webhookId,
      });
    }
  }, [data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/paypal/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("PayPal configuration saved");
      mutate("/api/admin/paypal/config");
    } catch {
      toast.error("Failed to save PayPal configuration");
    } finally {
      setSaving(false);
    }
  }

  async function handleSetup() {
    setRunning(true);
    setSetupResult(null);
    try {
      const res = await fetch("/api/admin/paypal/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Setup failed");
      setSetupResult(data as SetupResult);
      // Pre-fill the form with new IDs
      setForm((prev) => ({
        ...prev,
        starter:   data.starter,
        growth:    data.growth,
        business:  data.business,
        productId: data.productId,
      }));
      toast.success("PayPal plans created and saved to database");
      mutate("/api/admin/paypal/config");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PayPal setup failed");
    } finally {
      setRunning(false);
    }
  }

  if (!can("settings:manage")) {
    return (
      <div>
        <PageHeader title="Billing Settings" description="Manage PayPal billing configuration" />
        <Card className="max-w-xl">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            You don&apos;t have permission to view this page.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Billing Settings"
        description="Manage PayPal products, billing plans, and webhook configuration"
      />

      <div className="max-w-3xl space-y-6">

        {/* Environment banner */}
        {!isLoading && data && (
          <div className={cn(
            "flex items-center gap-3 rounded-xl border px-4 py-3",
            data.env === "production"
              ? "border-emerald-500/20 bg-emerald-500/[0.07]"
              : "border-amber-500/20 bg-amber-500/[0.07]"
          )}>
            {data.env === "production"
              ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            }
            <div className="flex-1 text-sm">
              <span className="font-semibold">
                {data.env === "production" ? "Production" : "Sandbox"} mode
              </span>
              {data.env !== "production" && (
                <span className="text-muted-foreground ml-1.5">
                  — Set <code className="text-xs bg-muted px-1 rounded">PAYPAL_ENV=production</code> in your environment to switch.
                </span>
              )}
            </div>
            <Badge variant="outline" className={cn(
              "text-xs font-semibold",
              data.env === "production"
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "border-amber-500/30 text-amber-600 dark:text-amber-400"
            )}>
              {data.env}
            </Badge>
          </div>
        )}

        {/* Auto-setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-5 w-5 text-primary" />
              Create Plans on PayPal
            </CardTitle>
            <CardDescription>
              Automatically create a PayPal product and all three billing plans (Starter, Growth,
              Business) with a 7-day free trial. The resulting plan IDs will be saved to the
              database immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground space-y-1">
              <p>Prerequisites:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs ml-1">
                <li><code className="bg-muted px-1 rounded">PAYPAL_CLIENT_ID</code> set in environment</li>
                <li><code className="bg-muted px-1 rounded">PAYPAL_CLIENT_SECRET</code> set in environment</li>
                <li><code className="bg-muted px-1 rounded">PAYPAL_ENV</code> set to <code className="bg-muted px-1 rounded">sandbox</code> or <code className="bg-muted px-1 rounded">production</code></li>
              </ul>
            </div>

            <Button onClick={handleSetup} disabled={running} variant="outline">
              {running ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Creating plans…</>
              ) : (
                <><Zap className="mr-2 h-4 w-4" /> Create PayPal Plans</>
              )}
            </Button>

            {setupResult && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] p-4 space-y-2">
                <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4" /> Plans created and saved
                </p>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                  <p>Product: {setupResult.productId}</p>
                  <p>Starter: {setupResult.starter}</p>
                  <p>Growth: {setupResult.growth}</p>
                  <p>Business: {setupResult.business}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual plan IDs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-5 w-5 text-primary" />
              PayPal Plan IDs
            </CardTitle>
            <CardDescription>
              Manually enter or update PayPal billing plan IDs. Values saved here override
              environment variables at runtime.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <form onSubmit={handleSave} className="space-y-5">
                <PlanIdField
                  label="Starter Plan ID  ($49/mo · 10 members)"
                  stored={data?.starter.stored ?? ""}
                  env={data?.starter.env ?? ""}
                  value={form.starter}
                  onChange={(v) => setForm((p) => ({ ...p, starter: v }))}
                />
                <PlanIdField
                  label="Growth Plan ID  ($149/mo · 30 members)"
                  stored={data?.growth.stored ?? ""}
                  env={data?.growth.env ?? ""}
                  value={form.growth}
                  onChange={(v) => setForm((p) => ({ ...p, growth: v }))}
                />
                <PlanIdField
                  label="Business Plan ID  ($299/mo · 100 members)"
                  stored={data?.business.stored ?? ""}
                  env={data?.business.env ?? ""}
                  value={form.business}
                  onChange={(v) => setForm((p) => ({ ...p, business: v }))}
                />

                <Separator />

                <div className="space-y-1.5">
                  <Label>PayPal Product ID</Label>
                  <Input
                    value={form.productId}
                    onChange={(e) => setForm((p) => ({ ...p, productId: e.target.value }))}
                    placeholder="PROD-XXXXXXXXXXXXXXXXXXXX"
                    className="font-mono text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Webhook ID</Label>
                    <a
                      href="https://developer.paypal.com/dashboard/applications"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      PayPal Developer Dashboard
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Input
                    value={form.webhookId}
                    onChange={(e) => setForm((p) => ({ ...p, webhookId: e.target.value }))}
                    placeholder="Webhook ID from PayPal"
                    className="font-mono text-sm"
                  />
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Save className="mr-2 h-4 w-4" /> Save Configuration</>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
