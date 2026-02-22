"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { KeyRound, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Extract the tenant subdomain — consistent with login-form and middleware. */
function getTenantSlug(): string {
  if (typeof window === "undefined") return "";
  const hostname = window.location.hostname;
  const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? "tasksmgr.solutions").replace(/^www\./, "");
  const suffix = `.${appDomain}`;
  if (hostname.endsWith(suffix)) {
    const sub = hostname.slice(0, hostname.length - suffix.length);
    if (sub && !sub.includes(".") && sub !== "www") return sub;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("__tenant") ?? "";
}

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  useEffect(() => {
    setTenantSlug(getTenantSlug());
  }, []);

  // Guard: only usable on a tenant subdomain (null = not yet determined, skip guard)
  if (tenantSlug !== null && !tenantSlug) {
    return (
      <div className="relative w-full">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-600/20 rounded-3xl blur-2xl -z-10" />
        <div className="relative rounded-2xl border border-white/[0.09] bg-[#0d1426]/90 backdrop-blur-sm p-8 text-center">
          <p className="text-sm text-white/60">
            Password reset is only available from your company workspace.<br />
            Access via <span className="text-blue-400">https://[your-company].tasksmgr.solutions</span>
          </p>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors mt-6">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const url = tenantSlug
        ? `/api/auth/reset-password?__tenant=${encodeURIComponent(tenantSlug)}`
        : "/api/auth/reset-password";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to reset password");
      } else {
        router.push("/login?reset=success");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative w-full">
      {/* Card glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-600/20 rounded-3xl blur-2xl -z-10" />

      <div className="relative rounded-2xl border border-white/[0.09] bg-[#0d1426]/90 backdrop-blur-sm p-8">
        {/* Logo & heading */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 items-center justify-center shadow-xl shadow-blue-500/25 mb-4">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set new password</h1>
          <p className="text-sm text-white/45 mt-1">
            Choose a strong password for your account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/65 mb-1.5"
            >
              New password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-white/65 mb-1.5"
            >
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-1"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 border-t border-white/[0.07]" />

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
