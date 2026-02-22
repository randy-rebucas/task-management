"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromSubscription = searchParams.get("subscribed") === "1";
  const planLabel = searchParams.get("plan");
  const prefilledEmail = searchParams.get("email") ?? "";

  const [form, setForm] = useState({
    email: prefilledEmail,
    password: "",
    firstName: "",
    lastName: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Registration failed");
      }
      setSuccess(true);
      setTimeout(() => router.push(fromSubscription ? "/login?subscribed=1" : "/login"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="relative w-full">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-3xl blur-2xl -z-10" />
        <div className="relative rounded-2xl border border-white/[0.09] bg-[#0d1426]/90 backdrop-blur-sm p-8 text-center">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center shadow-xl shadow-emerald-500/25 mb-4">
            <CheckCircle className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Account created!</h1>
          <p className="text-sm text-white/45 mb-6">
            Your account is ready. Redirecting you to sign in…
          </p>
          <Link
            href="/login"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            Go to sign in now
          </Link>
        </div>
      </div>
    );
  }

  // ── Register form ──────────────────────────────────────────────────────────
  return (
    <div className="relative w-full">
      {/* Card glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-600/20 rounded-3xl blur-2xl -z-10" />

      <div className="relative rounded-2xl border border-white/[0.09] bg-[#0d1426]/90 backdrop-blur-sm p-8">
        {/* Logo & heading */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 items-center justify-center shadow-xl shadow-blue-500/25 mb-4">
            <CheckCircle className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {fromSubscription ? "Almost there!" : "Create your account"}
          </h1>
          <p className="text-sm text-white/45 mt-1">
            {fromSubscription
              ? `Your ${planLabel ? planLabel.charAt(0).toUpperCase() + planLabel.slice(1) + " plan" : "subscription"} is ready — create your account to continue`
              : "Join TaskMgr and start managing work"}
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
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-white/65 mb-1.5"
              >
                First name
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="Jane"
                value={form.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-white/65 mb-1.5"
              >
                Last name
              </label>
              <input
                id="lastName"
                type="text"
                placeholder="Doe"
                value={form.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                required
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-white/65 mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              required
              className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/65 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
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
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 border-t border-white/[0.07]" />

        {/* Footer links */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>
          <Link
            href="/login"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Already have an account?
          </Link>
        </div>
      </div>
    </div>
  );
}
