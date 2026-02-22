"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "@/components/admin/admin-shell";
import { Settings, Zap, LayoutGrid, RefreshCw } from "lucide-react";

interface PlatformSetting {
  key: string;
  value: unknown;
  description: string;
  group: string;
}

const PLAN_OPTIONS = ["trial", "starter", "growth", "business", "enterprise"];

const GROUP_LABELS: Record<string, string> = {
  general: "General",
  features: "Feature Flags",
  plans: "Plan Limits",
};

const GROUP_ICONS: Record<string, React.ReactNode> = {
  general: <Settings className="h-4 w-4 text-blue-400" />,
  features: <Zap className="h-4 w-4 text-violet-400" />,
  plans: <LayoutGrid className="h-4 w-4 text-indigo-400" />,
};

const GROUP_ORDER = ["general", "features", "plans"];

function SavedBadge({ visible }: { visible: boolean }) {
  return (
    <span
      className={`text-xs font-medium text-emerald-400 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      Saved
    </span>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2 focus:ring-offset-[#0d1426] disabled:cursor-not-allowed disabled:opacity-40 ${
        checked
          ? "bg-gradient-to-r from-blue-500 to-violet-600 shadow-lg shadow-blue-500/30"
          : "bg-white/[0.10]"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function BooleanRow({
  setting,
  onSave,
}: {
  setting: PlatformSetting;
  onSave: (key: string, value: unknown) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleChange = async (val: boolean) => {
    setSaving(true);
    await onSave(setting.key, val);
    setSaving(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium text-white">
          {formatKey(setting.key)}
        </p>
        {setting.description && (
          <p className="text-xs text-white/45 mt-0.5">{setting.description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <SavedBadge visible={showSaved} />
        <ToggleSwitch
          checked={Boolean(setting.value)}
          onChange={handleChange}
          disabled={saving}
        />
      </div>
    </div>
  );
}

function NumberRow({
  setting,
  onSave,
}: {
  setting: PlatformSetting;
  onSave: (key: string, value: unknown) => Promise<void>;
}) {
  const [val, setVal] = useState(String(setting.value ?? ""));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setVal(String(setting.value ?? ""));
    setDirty(false);
  }, [setting.value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVal(e.target.value);
    setDirty(e.target.value !== String(setting.value ?? ""));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(setting.key, Number(val));
    setSaving(false);
    setDirty(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium text-white">
          {formatKey(setting.key)}
        </p>
        {setting.description && (
          <p className="text-xs text-white/45 mt-0.5">{setting.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <SavedBadge visible={showSaved} />
        <input
          type="number"
          value={val}
          onChange={handleChange}
          className="w-24 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white px-3 py-1.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
        />
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-blue-500/20"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function StringRow({
  setting,
  onSave,
}: {
  setting: PlatformSetting;
  onSave: (key: string, value: unknown) => Promise<void>;
}) {
  const [val, setVal] = useState(String(setting.value ?? ""));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setVal(String(setting.value ?? ""));
    setDirty(false);
  }, [setting.value]);

  const isSelect = setting.key === "new_tenant_plan";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setVal(e.target.value);
    setDirty(e.target.value !== String(setting.value ?? ""));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(setting.key, val);
    setSaving(false);
    setDirty(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  return (
    <div className="flex items-center justify-between py-3.5">
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium text-white">
          {formatKey(setting.key)}
        </p>
        {setting.description && (
          <p className="text-xs text-white/45 mt-0.5">{setting.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <SavedBadge visible={showSaved} />
        {isSelect ? (
          <select
            value={val}
            onChange={handleChange}
            className="rounded-xl bg-white/[0.06] border border-white/[0.10] text-white px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p} className="bg-[#0d1426] text-white">
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={val}
            onChange={handleChange}
            className="w-48 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white px-3 py-1.5 text-sm placeholder:text-white/25 focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
          />
        )}
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-lg shadow-blue-500/20"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .replace(/^feature\./, "")
    .replace(/^plan_limits\./, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function SettingRow({
  setting,
  onSave,
}: {
  setting: PlatformSetting;
  onSave: (key: string, value: unknown) => Promise<void>;
}) {
  const type = typeof setting.value;

  if (type === "boolean") {
    return <BooleanRow setting={setting} onSave={onSave} />;
  }
  if (type === "number") {
    return <NumberRow setting={setting} onSave={onSave} />;
  }
  return <StringRow setting={setting} onSave={onSave} />;
}

export default function PlatformSettingsPage() {
  const { apiFetch } = useAdmin();
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/platform/settings");
      const data = await res.json();
      setSettings(data.settings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (key: string, value: unknown) => {
    try {
      const res = await apiFetch("/api/platform/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const updated = await res.json();
      setSettings((prev) =>
        prev.map((s) =>
          s.key === key ? { ...s, value: updated.setting?.value ?? value } : s
        )
      );
    } catch (err) {
      console.error("Failed to save setting:", err);
    }
  };

  const grouped = GROUP_ORDER.reduce<Record<string, PlatformSetting[]>>(
    (acc, g) => {
      acc[g] = settings.filter((s) => s.group === g);
      return acc;
    },
    {}
  );

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[300px] bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-0 w-[250px] h-[250px] bg-indigo-600/8 rounded-full blur-[80px]" />
      </div>

      <div className="p-8 max-w-3xl space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Platform Settings
              </h1>
            </div>
            <p className="text-sm text-white/45 ml-[52px]">
              Global configuration for all tenants. Changes take effect immediately.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.10] text-white/60 text-xs font-medium hover:bg-white/[0.05] hover:text-white/80 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={load}
              className="text-xs text-red-400 underline hover:text-red-300 transition-colors ml-3"
            >
              Retry
            </button>
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 animate-pulse"
              >
                <div className="h-4 w-36 bg-white/[0.08] rounded-lg mb-5" />
                {[1, 2, 3].map((j) => (
                  <div
                    key={j}
                    className="flex justify-between items-center py-3.5 border-t border-white/[0.06]"
                  >
                    <div className="space-y-1.5">
                      <div className="h-3 w-44 bg-white/[0.08] rounded" />
                      <div className="h-2.5 w-64 bg-white/[0.05] rounded" />
                    </div>
                    <div className="h-6 w-11 bg-white/[0.08] rounded-full" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Setting Groups */}
        {!loading &&
          GROUP_ORDER.map((group) => {
            const rows = grouped[group] ?? [];
            if (rows.length === 0) return null;
            return (
              <div
                key={group}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden"
              >
                {/* Group header */}
                <div className="px-6 py-4 border-b border-white/[0.07] bg-white/[0.02]">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center">
                      {GROUP_ICONS[group]}
                    </div>
                    <h2 className="text-xs font-semibold text-white/65 uppercase tracking-widest">
                      {GROUP_LABELS[group] ?? group}
                    </h2>
                  </div>
                </div>

                {/* Rows */}
                <div className="px-6 divide-y divide-white/[0.06]">
                  {rows.map((s) => (
                    <SettingRow key={s.key} setting={s} onSave={handleSave} />
                  ))}
                </div>
              </div>
            );
          })}

        {!loading && settings.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-600/10 border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
              <Settings className="h-6 w-6 text-white/25" />
            </div>
            <p className="text-sm text-white/35">No settings found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
