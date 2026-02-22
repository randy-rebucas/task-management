"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<{ subdomain: string; loginUrl: string } | null>(null);
  const [form, setForm] = useState({
    companyName: "",
    subdomain: "",
    adminEmail: "",
    adminPassword: "",
    adminFirstName: "",
    adminLastName: "",
  });

  const handleSubdomainBlur = () => {
    // Auto-slugify from company name if subdomain is empty
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
      setSuccess({ subdomain: form.subdomain, loginUrl: data.loginUrl });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const host =
    typeof window !== "undefined"
      ? window.location.host.replace(/^[^.]+\./, "")
      : "yourdomain.com";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re all set! 🎉</h2>
          <p className="text-gray-600 mb-6">
            Your workspace is ready at{" "}
            <strong className="text-indigo-600">
              {success.subdomain}.{host}
            </strong>
          </p>
          <a
            href={`//${success.subdomain}.${host}/login`}
            className="block w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
          >
            Go to your workspace →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Start your free trial</h1>
          <p className="text-gray-500 mt-2">14 days free · No credit card required</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={form.adminFirstName}
                onChange={(e) => setForm((f) => ({ ...f, adminFirstName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={form.adminLastName}
                onChange={(e) => setForm((f) => ({ ...f, adminLastName: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              type="text"
              required
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              onBlur={handleSubdomainBlur}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Workspace URL
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent">
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
                className="flex-1 px-3 py-2 text-sm outline-none"
                placeholder="my-company"
                minLength={3}
                maxLength={30}
              />
              <span className="bg-gray-50 text-gray-500 text-sm px-3 py-2 border-l">
                .{host}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Work Email
            </label>
            <input
              type="email"
              required
              value={form.adminEmail}
              onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="jane@acmecorp.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.adminPassword}
              onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Minimum 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition mt-2"
          >
            {loading ? "Creating your workspace…" : "Create your workspace →"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have a workspace?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
