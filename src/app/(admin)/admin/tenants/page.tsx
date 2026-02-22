"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/components/admin/admin-shell";
import {
  Search, Plus, ExternalLink, RefreshCw, X, Loader2,
} from "lucide-react";
import Link from "next/link";

type Tenant = {
  _id: string;
  name: string;
  slug: string;
  adminEmail: string;
  plan: string;
  status: string;
  maxUsers: number;
  trialEndsAt?: string;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-emerald-500/20 text-emerald-400",
  trial:     "bg-blue-500/20 text-blue-400",
  suspended: "bg-yellow-500/20 text-yellow-400",
  cancelled: "bg-red-500/20 text-red-400",
  pending:   "bg-gray-500/20 text-gray-400",
};

const PLAN_COLOR: Record<string, string> = {
  trial:      "text-gray-400",
  starter:    "text-sky-400",
  growth:     "text-indigo-400",
  business:   "text-purple-400",
  enterprise: "text-amber-400",
};

const PLANS = ["trial", "starter", "growth", "business", "enterprise"];
const STATUSES = ["active", "trial", "suspended", "cancelled", "pending"];

// ── Create Tenant Modal ────────────────────────────────────────────────────────

type CreateForm = {
  companyName: string; subdomain: string; adminEmail: string;
  adminPassword: string; adminFirstName: string; adminLastName: string;
  plan: string;
};

function CreateTenantModal({
  onClose,
  onCreated,
  apiFetch,
}: {
  onClose: () => void;
  onCreated: () => void;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}) {
  const [form, setForm] = useState<CreateForm>({
    companyName: "", subdomain: "", adminEmail: "",
    adminPassword: "", adminFirstName: "", adminLastName: "", plan: "trial",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: keyof CreateForm, v: string) {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      // Auto-slugify subdomain when typing company name
      if (k === "companyName" && prev.subdomain === prev.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) {
        next.subdomain = v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/platform/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      onCreated();
      onClose();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 className="text-base font-semibold text-white">Create Tenant</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name" value={form.adminFirstName} onChange={(v) => set("adminFirstName", v)} required />
            <Field label="Last Name"  value={form.adminLastName}  onChange={(v) => set("adminLastName", v)}  required />
          </div>
          <Field label="Company Name" value={form.companyName} onChange={(v) => set("companyName", v)} required />
          <div>
            <Field
              label="Subdomain"
              value={form.subdomain}
              onChange={(v) => set("subdomain", v.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
              hint={`${form.subdomain || "acme"}.yourdomain.com`}
            />
          </div>
          <Field label="Admin Email"    value={form.adminEmail}    onChange={(v) => set("adminEmail", v)}    type="email"    required />
          <Field label="Admin Password" value={form.adminPassword} onChange={(v) => set("adminPassword", v)} type="password" required />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Plan</label>
            <select
              value={form.plan}
              onChange={(e) => set("plan", e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
            >
              {PLANS.map((p) => (
                <option key={p} value={p} className="capitalize">{p}</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; hint?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
      />
      {hint && <p className="mt-1 text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const { apiFetch } = useAdmin();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (statusFilter) params.set("status", statusFilter);
      if (planFilter) params.set("plan", planFilter);
      const res = await apiFetch(`/api/platform/tenants?${params}`);
      if (!res.ok) { setError("Failed to load tenants"); return; }
      const data = await res.json();
      setTenants(data.tenants ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch, search, statusFilter, planFilter]);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setActionLoading(id);
    await apiFetch(`/api/platform/tenants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
    setActionLoading(null);
  }

  async function cancel(id: string) {
    if (!confirm("Mark this tenant as cancelled?")) return;
    setActionLoading(id);
    await apiFetch(`/api/platform/tenants/${id}`, { method: "DELETE" });
    await load();
    setActionLoading(null);
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenants</h1>
          <p className="mt-0.5 text-sm text-gray-500">{total} workspace{total !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          New Tenant
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search name, slug, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-9 pr-3 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-300 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All plans</option>
          {PLANS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
        </select>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-800 bg-gray-900 text-left">
            <tr className="text-xs text-gray-500">
              <th className="px-4 py-3">Workspace</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Users</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-950">
            {loading && (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gray-600" />
                </td>
              </tr>
            )}
            {!loading && tenants.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-600">
                  No tenants found.
                </td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={t._id} className="hover:bg-gray-900/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.slug}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">{t.adminEmail}</td>
                <td className="px-4 py-3">
                  <select
                    value={t.plan}
                    disabled={!!actionLoading}
                    onChange={(e) => patch(t._id, { plan: e.target.value })}
                    className={`rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-xs focus:outline-none capitalize ${PLAN_COLOR[t.plan] ?? "text-gray-300"}`}
                  >
                    {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGE[t.status] ?? "bg-gray-500/20 text-gray-400"}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-center">{t.maxUsers}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/admin/tenants/${t._id}`}
                      className="flex items-center gap-1 rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
                    </Link>
                    {t.status === "active" && (
                      <button
                        disabled={!!actionLoading}
                        onClick={() => patch(t._id, { status: "suspended" })}
                        className="rounded bg-yellow-600/20 px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-600/30 disabled:opacity-50 transition-colors"
                      >
                        Suspend
                      </button>
                    )}
                    {t.status === "suspended" && (
                      <button
                        disabled={!!actionLoading}
                        onClick={() => patch(t._id, { status: "active" })}
                        className="rounded bg-emerald-600/20 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50 transition-colors"
                      >
                        Activate
                      </button>
                    )}
                    {t.status !== "cancelled" && (
                      <button
                        disabled={!!actionLoading}
                        onClick={() => cancel(t._id)}
                        className="rounded bg-red-600/20 px-2 py-1 text-xs text-red-400 hover:bg-red-600/30 disabled:opacity-50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    {actionLoading === t._id && (
                      <Loader2 className="h-3 w-3 animate-spin text-gray-500" />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateTenantModal apiFetch={apiFetch} onClose={() => setShowCreate(false)} onCreated={load} />
      )}
    </div>
  );
}
