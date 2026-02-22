import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function TenantSuspendedPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#080d1a] px-6">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-amber-600/12 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[350px] bg-orange-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-yellow-600/8 rounded-full blur-[80px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-3xl blur-2xl -z-10" />
        <div className="relative rounded-2xl border border-white/[0.09] bg-[#0d1426]/90 backdrop-blur-sm p-10 text-center">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 items-center justify-center shadow-xl shadow-amber-500/25 mb-5 mx-auto">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Workspace Suspended</h1>
          <p className="text-sm text-white/50 mb-8 leading-relaxed">
            This workspace has been suspended. If you believe this is a mistake,
            please contact support.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="mailto:support@tasksmgr.solutions"
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center shadow-lg shadow-amber-500/20"
            >
              Contact Support
            </Link>
            <Link
              href="/"
              className="h-11 px-6 rounded-xl border border-white/[0.12] bg-white/[0.05] text-white/70 font-semibold text-sm hover:bg-white/[0.09] hover:text-white transition-all flex items-center justify-center"
            >
              Go to homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
