"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Building2,
  Settings,
  LogOut,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";

// ── Context ────────────────────────────────────────────────────────────────────

type AdminCtx = {
  secret: string;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  signOut: () => void;
};

const AdminContext = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminShell");
  return ctx;
}

// ── Auth Gate ──────────────────────────────────────────────────────────────────

function AuthGate({ onAuth }: { onAuth: (s: string) => void }) {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/stats", {
        headers: { "x-super-admin-secret": value },
      });
      if (res.ok) {
        localStorage.setItem("__pa_secret", value);
        onAuth(value);
      } else {
        setError("Invalid secret. Check your SUPER_ADMIN_SECRET env var.");
      }
    } catch {
      setError("Network error. Is the dev server running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-500/30 mb-4">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Platform Admin</h1>
          <p className="mt-1 text-sm text-gray-500">Super-admin access only</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-400">
              Super-admin secret
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                placeholder="Enter SUPER_ADMIN_SECRET"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2.5 pl-4 pr-10 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !value.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading ? "Verifying…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: "/admin",          label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/tenants",  label: "Tenants",   icon: Building2 },
  { href: "/admin/settings", label: "Settings",  icon: Settings },
];

function Sidebar({ onSignOut }: { onSignOut: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-56 flex-shrink-0 flex-col border-r border-gray-800 bg-gray-900">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <ShieldCheck className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-semibold text-white">Platform Admin</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-600/20 text-indigo-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-2 pb-4">
        <button
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-800 hover:text-red-400"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

// ── Shell (provider + layout) ─────────────────────────────────────────────────

export default function AdminShell({ children }: { children: ReactNode }) {
  const [secret, setSecret] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Read from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem("__pa_secret");
    if (stored) setSecret(stored);
    setHydrated(true);
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem("__pa_secret");
    setSecret(null);
  }, []);

  const apiFetch = useCallback(
    (path: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (secret) headers.set("x-super-admin-secret", secret);
      return fetch(path, { ...init, headers });
    },
    [secret]
  );

  // Wait for hydration to avoid flicker
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
      </div>
    );
  }

  if (!secret) {
    return <AuthGate onAuth={setSecret} />;
  }

  return (
    <AdminContext.Provider value={{ secret, apiFetch, signOut }}>
      <div className="flex h-screen overflow-hidden bg-gray-950 text-gray-100">
        <Sidebar onSignOut={signOut} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </AdminContext.Provider>
  );
}
