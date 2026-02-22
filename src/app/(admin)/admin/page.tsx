"use client";

import { useState, useEffect, useCallback } from "react";
import { useAdmin } from "@/components/admin/admin-shell";
import { Building2, Users, DollarSign, TrendingUp, RefreshCw, ExternalLink } from "lucide-react";
import Link from "next/link";

type Stats = {
  total: number;
  byStatus: Record<string, number>;
  byPlan: Record<string, number>;
  mrr: number;
  recentSignups: { label: string; count: number }[];
};

const PLAN_COLORS: Record<string, string> = {
  trial:      "bg-gray-600",
  starter:    "bg-sky-600",
  growth:     "bg-indigo-600",
  business:   "bg-purple-600",
  enterprise: "bg-amber-600",
};

const PLAN_MRR: Record<string, number> = {
  trial: 0, starter: 29, growth: 79, business: 199, enterprise: 499,
};

export default function DashboardPage() {
  const { apiFetch } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch("/api/platform/stats");
      if (!res.ok) { setError("Failed to load stats"); return; }
      setStats((await res.json()) as Stats);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => { load(); }, [load]);

  const maxBarCount = stats
    ? Math.max(...stats.recentSignups.map((r) => r.count), 1)
    : 1;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">Platform-wide overview</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* KPI cards */}
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              {
                label: "Total Workspaces",
                value: stats.total,
                icon: Building2,
                color: "text-indigo-400",
                bg: "bg-indigo-500/10",
              },
              {
                label: "Active",
                value: stats.byStatus.active ?? 0,
                icon: Users,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                label: "Monthly Revenue",
                value: `$${stats.mrr.toLocaleString()}`,
                icon: DollarSign,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                label: "On Trial",
                value: stats.byStatus.trial ?? 0,
                icon: TrendingUp,
                color: "text-sky-400",
                bg: "bg-sky-500/10",
              },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="rounded-xl border border-gray-800 bg-gray-900 p-5"
              >
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${bg} mb-3`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="mt-0.5 text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-3 gap-4">
            {(["suspended", "cancelled", "pending"] as const).map((status) => (
              <div
                key={status}
                className="rounded-xl border border-gray-800 bg-gray-900 px-5 py-4 flex items-center justify-between"
              >
                <span className="text-sm capitalize text-gray-500">{status}</span>
                <span className="text-lg font-semibold text-white">
                  {stats.byStatus[status] ?? 0}
                </span>
              </div>
            ))}
          </div>

          {/* Two columns: plan breakdown + weekly chart */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Plan breakdown */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="mb-4 text-sm font-semibold text-gray-300">By Plan</h2>
              <div className="space-y-3">
                {Object.entries(stats.byPlan).map(([plan, count]) => {
                  const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={plan}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="capitalize text-gray-400">{plan}</span>
                        <span className="text-gray-500">
                          {count} &middot; ${(count * (PLAN_MRR[plan] ?? 0)).toLocaleString()}/mo
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
                        <div
                          className={`h-2 rounded-full transition-all ${PLAN_COLORS[plan] ?? "bg-gray-600"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Weekly signups chart */}
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="mb-4 text-sm font-semibold text-gray-300">
                Weekly Signups
              </h2>
              {stats.recentSignups.length === 0 ? (
                <p className="text-sm text-gray-600">No signup data yet.</p>
              ) : (
                <div className="flex h-32 items-end gap-1.5">
                  {stats.recentSignups.map((row) => (
                    <div
                      key={row.label}
                      className="group flex flex-1 flex-col items-center gap-1"
                    >
                      <div
                        className="relative w-full rounded-t bg-indigo-600 transition-all group-hover:bg-indigo-500"
                        style={{ height: `${(row.count / maxBarCount) * 100}%`, minHeight: 4 }}
                      >
                        <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-gray-700 px-1.5 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100">
                          {row.count}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-600 truncate w-full text-center">
                        {row.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="flex gap-3">
            <Link
              href="/admin/tenants"
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white hover:border-indigo-600 transition-colors"
            >
              <Building2 className="h-4 w-4" />
              Manage Tenants
              <ExternalLink className="h-3 w-3 opacity-50" />
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-400 hover:text-white hover:border-indigo-600 transition-colors"
            >
              Platform Settings
              <ExternalLink className="h-3 w-3 opacity-50" />
            </Link>
          </div>
        </>
      )}

      {loading && !stats && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-600" />
        </div>
      )}
    </div>
  );
}
