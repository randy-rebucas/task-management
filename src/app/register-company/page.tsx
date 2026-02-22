"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ loginUrl: string } | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    subdomain: "",
    adminEmail: "",
    adminPassword: "",
    adminFirstName: "",
    adminLastName: "",
  });

  const handleSubdomainBlur = () => {
    if (!form.subdomain && form.companyName) {
      setForm((f) => ({
        ...f,
        subdomain: f.companyName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 30),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/platform/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        return;
      }
      setSuccess({ loginUrl: data.loginUrl });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? "tasksmgr.solutions").replace(/^www\./, "");

  // ── Success ────────────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#080d1a] px-6">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-600/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[350px] bg-teal-600/10 rounded-full blur-[100px]" />
        </div>
        <div className="relative w-full max-w-md">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-3xl blur-2xl -z-10" />
          <div className="relative rounded-2xl border border-white/[0.09] bg-[#0d1426]/90 backdrop-blur-sm p-10 text-center">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 items-center justify-center shadow-xl shadow-emerald-500/25 mb-5">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">You&apos;re all set! 🎉</h2>
            <p className="text-sm text-white/50 mb-2">Your workspace is ready at</p>
            <p className="text-blue-400 font-semibold text-sm mb-8 break-all">
              {success.loginUrl.replace(/\/login$/, "")}
            </p>
            <a
              href={success.loginUrl}
              className="block w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center shadow-lg shadow-emerald-500/20"
            >
              Go to your workspace →
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#080d1a] px-6 py-12">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[350px] bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-indigo-600/8 rounded-full blur-[80px]" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Card glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-violet-600/20 rounded-3xl blur-2xl -z-10" />

        <div className="relative rounded-2xl border border-white/[0.09] bg-[#0d1426]/90 backdrop-blur-sm p-8">
          {/* Logo & heading */}
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 items-center justify-center shadow-xl shadow-blue-500/25 mb-4">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Start your free trial</h1>
            <p className="text-sm text-white/45 mt-1">14 days free · No credit card required</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white/65 mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  value={form.adminFirstName}
                  onChange={(e) => setForm((f) => ({ ...f, adminFirstName: e.target.value }))}
                  placeholder="Jane"
                  className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/65 mb-1.5">Last Name</label>
                <input
                  type="text"
                  required
                  value={form.adminLastName}
                  onChange={(e) => setForm((f) => ({ ...f, adminLastName: e.target.value }))}
                  placeholder="Smith"
                  className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
                />
              </div>
            </div>

            {/* Company name */}
            <div>
              <label className="block text-sm font-medium text-white/65 mb-1.5">Company Name</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                onBlur={handleSubdomainBlur}
                placeholder="Acme Corp"
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
              />
            </div>

            {/* Workspace URL */}
            <div>
              <label className="block text-sm font-medium text-white/65 mb-1.5">Workspace URL</label>
              <div className="flex h-11 rounded-xl border border-white/[0.10] bg-white/[0.06] overflow-hidden focus-within:border-blue-500/60 focus-within:bg-white/[0.09] transition-all">
                <input
                  type="text"
                  required
                  value={form.subdomain}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                  placeholder="my-company"
                  minLength={3}
                  maxLength={30}
                  className="flex-1 px-4 bg-transparent text-white placeholder:text-white/25 text-sm outline-none"
                />
                <span className="flex items-center px-3 border-l border-white/[0.10] text-white/35 text-sm whitespace-nowrap">
                  .{appDomain}
                </span>
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/65 mb-1.5">Work Email</label>
              <input
                type="email"
                required
                value={form.adminEmail}
                onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                placeholder="jane@acmecorp.com"
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white/65 mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.adminPassword}
                onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                placeholder="Minimum 8 characters"
                className="w-full h-11 px-4 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.09] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-1"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creating your workspace…" : "Create your workspace →"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 border-t border-white/[0.07]" />

          {/* Footer */}
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
              Already have a workspace?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
