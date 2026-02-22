"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/components/admin/admin-shell";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Save, RefreshCw,
  User, CreditCard, Settings, LayoutGrid,
  CheckCircle, XCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tenant = {
  _id: string; name: string; slug: string; dbName: string;
  adminEmail: string; plan: string; status: string;
  maxUsers: number; trialEndsAt?: string; primaryColor?: string;
  createdAt: string; updatedAt: string;
};

type TenantDetail = {
  tenant: Tenant;
  userCount: number;
  subscriptionCount: number;
};

type UserRow = {
  _id: string; firstName: string; lastName: string; email: string;
  isActive: boolean; createdAt: string;
  roles: { _id: string; name: string; slug: string }[];
};

type SubRow = {
  _id: string; email: string; plan: string; status: string;
  amount: number; currency: string; paypalSubscriptionId: string;
  nextBillingTime?: string; createdAt: string;
};

type AppSettingRow = { _id: string; key: string; value: unknown };

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-emerald-500/20 text-emerald-400",
  trial:     "bg-blue-500/20 text-blue-400",
  suspended: "bg-yellow-500/20 text-yellow-400",
  cancelled: "bg-red-500/20 text-red-400",
  pending:   "bg-gray-500/20 text-gray-400",
};

const PLANS    = ["trial", "starter", "growth", "business", "enterprise"];
const STATUSES = ["active", "trial", "suspended", "cancelled", "pending"];
const MRR: Record<string, number> = { trial: 0, starter: 29, growth: 79, business: 199, enterprise: 499 };

function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${className}`}>
      {label}
    </span>
  );
}

// ── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({
  detail, onRefresh, apiFetch, id,
}: {
  detail: TenantDetail;
  onRefresh: () => void;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  id: string;
}) {
  const { tenant, userCount, subscriptionCount } = detail;
  const [form, setForm] = useState({ plan: tenant.plan, status: tenant.status, maxUsers: tenant.maxUsers });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    await apiFetch(`/api/platform/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setMsg("Saved");
    onRefresh();
    setSaving(false);
    setTimeout(() => setMsg(""), 2000);
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Users", value: userCount },
          { label: "Subscriptions", value: subscriptionCount },
          { label: "Est. MRR", value: `$${MRR[tenant.plan] ?? 0}/mo` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Info grid */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Details</h3>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {[
            ["Workspace name", tenant.name],
            ["Subdomain",      tenant.slug],
            ["Database",       tenant.dbName],
            ["Admin email",    tenant.adminEmail],
            ["Created",        new Date(tenant.createdAt).toLocaleString()],
            ["Last updated",   new Date(tenant.updatedAt).toLocaleString()],
            ...(tenant.trialEndsAt
              ? [["Trial ends", new Date(tenant.trialEndsAt).toLocaleString()]]
              : []),
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-200 break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Edit */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Edit Tenant</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Plan</label>
            <select
              value={form.plan}
              onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-gray-400">Max Users</label>
            <input
              type="number"
              min={1}
              value={form.maxUsers}
              onChange={(e) => setForm((f) => ({ ...f, maxUsers: Number(e.target.value) }))}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
          {msg && <span className="text-xs text-emerald-400">{msg}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Users ────────────────────────────────────────────────────────────────

function UsersTab({ id, apiFetch }: { id: string; apiFetch: (path: string, init?: RequestInit) => Promise<Response> }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/platform/tenants/${id}/users`)
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  }, [id, apiFetch]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-gray-600" />;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800 bg-gray-900 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Roles</th>
            <th className="px-4 py-3 text-center">Active</th>
            <th className="px-4 py-3 text-left">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-950">
          {users.length === 0 && (
            <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-600">No users found.</td></tr>
          )}
          {users.map((u) => (
            <tr key={u._id} className="hover:bg-gray-900/40 transition-colors">
              <td className="px-4 py-3 font-medium text-white">
                {u.firstName} {u.lastName}
              </td>
              <td className="px-4 py-3 text-gray-400">{u.email}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {u.roles.map((r) => (
                    <span key={r._id} className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-300">
                      {r.name}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                {u.isActive
                  ? <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                  : <XCircle    className="mx-auto h-4 w-4 text-red-500" />}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Subscriptions ────────────────────────────────────────────────────────

const SUB_STATUS: Record<string, string> = {
  ACTIVE:           "bg-emerald-500/20 text-emerald-400",
  APPROVED:         "bg-blue-500/20 text-blue-400",
  APPROVAL_PENDING: "bg-yellow-500/20 text-yellow-400",
  SUSPENDED:        "bg-yellow-500/20 text-yellow-400",
  CANCELLED:        "bg-red-500/20 text-red-400",
  EXPIRED:          "bg-gray-500/20 text-gray-400",
};

function SubscriptionsTab({ id, apiFetch }: { id: string; apiFetch: (path: string, init?: RequestInit) => Promise<Response> }) {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/platform/tenants/${id}/subscriptions`)
      .then((r) => r.json())
      .then((d) => setSubs(d.subscriptions ?? []))
      .finally(() => setLoading(false));
  }, [id, apiFetch]);

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-gray-600" />;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-800 bg-gray-900 text-xs text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Plan</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Amount</th>
            <th className="px-4 py-3 text-left">Next Billing</th>
            <th className="px-4 py-3 text-left">PayPal ID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-gray-950">
          {subs.length === 0 && (
            <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-600">No subscriptions found.</td></tr>
          )}
          {subs.map((s) => (
            <tr key={s._id} className="hover:bg-gray-900/40 transition-colors">
              <td className="px-4 py-3 text-gray-300">{s.email}</td>
              <td className="px-4 py-3 capitalize text-gray-300">{s.plan}</td>
              <td className="px-4 py-3">
                <Badge label={s.status} className={SUB_STATUS[s.status] ?? "bg-gray-500/20 text-gray-400"} />
              </td>
              <td className="px-4 py-3 text-gray-300">
                {s.currency} {s.amount.toFixed(2)}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500">
                {s.nextBillingTime ? new Date(s.nextBillingTime).toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-gray-600 font-mono truncate max-w-32">
                {s.paypalSubscriptionId}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: App Settings ─────────────────────────────────────────────────────────
// Read-only keys (display only)
const RO_KEYS = new Set(["weekly_summary_last_sent"]);

function SettingRow({
  setting, onSave,
}: {
  setting: AppSettingRow;
  onSave: (key: string, value: unknown) => Promise<void>;
}) {
  const [val, setVal] = useState(setting.value);
  const [saving, setSaving] = useState(false);
  const isRO = RO_KEYS.has(setting.key);
  const isBool = typeof setting.value === "boolean";
  const isNum  = typeof setting.value === "number";

  async function save() {
    setSaving(true);
    await onSave(setting.key, isBool ? Boolean(val) : isNum ? Number(val) : val);
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white font-mono">{setting.key}</p>
      </div>
      <div className="flex items-center gap-2">
        {isRO ? (
          <span className="text-xs text-gray-500 font-mono">{String(val)}</span>
        ) : isBool ? (
          <button
            onClick={async () => { setVal(!val); await onSave(setting.key, !val); }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${val ? "bg-indigo-600" : "bg-gray-700"}`}
          >
            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${val ? "translate-x-[18px]" : "translate-x-1"}`} />
          </button>
        ) : isNum ? (
          <>
            <input
              type="number"
              value={val as number}
              onChange={(e) => setVal(Number(e.target.value))}
              className="w-24 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none"
            />
            <button
              onClick={save}
              disabled={saving || val === setting.value}
              className="flex items-center gap-1 rounded bg-indigo-600/80 px-2 py-1 text-xs text-white hover:bg-indigo-600 disabled:opacity-40 transition-colors"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </button>
          </>
        ) : (
          <>
            <input
              type="text"
              value={val as string}
              onChange={(e) => setVal(e.target.value)}
              className="w-48 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-white focus:outline-none"
            />
            <button
              onClick={save}
              disabled={saving || val === setting.value}
              className="flex items-center gap-1 rounded bg-indigo-600/80 px-2 py-1 text-xs text-white hover:bg-indigo-600 disabled:opacity-40 transition-colors"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function AppSettingsTab({ id, apiFetch }: { id: string; apiFetch: (path: string, init?: RequestInit) => Promise<Response> }) {
  const [settings, setSettings] = useState<AppSettingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/api/platform/tenants/${id}/app-settings`)
      .then((r) => r.json())
      .then((d) => setSettings(d.settings ?? []))
      .finally(() => setLoading(false));
  }, [id, apiFetch]);

  useEffect(() => { load(); }, [load]);

  async function save(key: string, value: unknown) {
    await apiFetch(`/api/platform/tenants/${id}/app-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    load();
  }

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-gray-600" />;

  if (settings.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No app settings found. They are created when automations first run.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {settings.map((s) => (
        <SettingRow key={s._id} setting={s} onSave={save} />
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { key: "overview",      label: "Overview",      icon: LayoutGrid  },
  { key: "users",         label: "Users",         icon: User        },
  { key: "subscriptions", label: "Subscriptions", icon: CreditCard  },
  { key: "app-settings",  label: "App Settings",  icon: Settings    },
] as const;

type TabKey = typeof TABS[number]["key"];

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { apiFetch } = useAdmin();
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch(`/api/platform/tenants/${id}`);
    if (res.ok) setDetail(await res.json());
    setLoading(false);
  }, [id, apiFetch]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-8 text-sm text-gray-500">Tenant not found.</div>
    );
  }

  const { tenant } = detail;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/admin/tenants"
          className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 text-gray-500 hover:text-white hover:border-gray-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{tenant.name}</h1>
            <Badge label={tenant.status} className={STATUS_BADGE[tenant.status] ?? "bg-gray-500/20 text-gray-400"} />
            <Badge label={tenant.plan}   className="bg-gray-700 text-gray-300" />
          </div>
          <p className="mt-0.5 text-sm text-gray-500">{tenant.slug} &middot; {tenant.adminEmail}</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-500 hover:text-white transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 rounded-lg border border-gray-800 bg-gray-900 p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-indigo-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "overview"      && <OverviewTab detail={detail} onRefresh={load} apiFetch={apiFetch} id={id} />}
        {tab === "users"         && <UsersTab id={id} apiFetch={apiFetch} />}
        {tab === "subscriptions" && <SubscriptionsTab id={id} apiFetch={apiFetch} />}
        {tab === "app-settings"  && <AppSettingsTab id={id} apiFetch={apiFetch} />}
      </div>
    </div>
  );
}
