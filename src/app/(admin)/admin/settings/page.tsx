"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdmin } from "@/components/admin/admin-shell";

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

const GROUP_ORDER = ["general", "features", "plans"];

function SavedBadge({ visible }: { visible: boolean }) {
  return (
    <span
      className={`text-xs font-medium text-green-600 transition-opacity duration-300 ${
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
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
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
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatKey(setting.key)}
        </p>
        {setting.description && (
          <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
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
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatKey(setting.key)}
        </p>
        {setting.description && (
          <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <SavedBadge visible={showSaved} />
        <input
          type="number"
          value={val}
          onChange={handleChange}
          className="w-24 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 min-w-0 pr-6">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {formatKey(setting.key)}
        </p>
        {setting.description && (
          <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <SavedBadge visible={showSaved} />
        {isSelect ? (
          <select
            value={val}
            onChange={handleChange}
            className="rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {PLAN_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={val}
            onChange={handleChange}
            className="w-48 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        )}
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-3 py-1 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Platform Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Global configuration for all tenants. Changes take effect immediately.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {error}{" "}
          <button onClick={load} className="underline ml-1">
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
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 animate-pulse"
            >
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="flex justify-between items-center py-3 border-t border-gray-100 dark:border-gray-700"
                >
                  <div className="h-3 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                  <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
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
              className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
            >
              {/* Group header */}
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {GROUP_LABELS[group] ?? group}
                </h2>
              </div>

              {/* Rows */}
              <div className="px-6 divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((s) => (
                  <SettingRow key={s.key} setting={s} onSave={handleSave} />
                ))}
              </div>
            </div>
          );
        })}

      {!loading && settings.length === 0 && !error && (
        <p className="text-center text-sm text-gray-500 py-12">
          No settings found.
        </p>
      )}
    </div>
  );
}
