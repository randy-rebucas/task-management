import Link from "next/link";

export default function TenantSuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Workspace Suspended</h1>
        <p className="text-gray-500 mb-8">
          This workspace has been suspended. If you believe this is a mistake, please contact support.
        </p>
        <Link
          href="mailto:support@yourdomain.com"
          className="bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-700 transition"
        >
          Contact Support
        </Link>
      </div>
    </div>
  );
}
