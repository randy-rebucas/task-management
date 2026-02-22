import Link from "next/link";

export default function TenantNotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Workspace Not Found</h1>
        <p className="text-gray-500 mb-8">
          The workspace you&apos;re looking for doesn&apos;t exist or may have been removed.
          Double-check the URL and try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register-company"
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
          >
            Create a workspace
          </Link>
          <Link
            href="/"
            className="bg-white text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition"
          >
            Go to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
