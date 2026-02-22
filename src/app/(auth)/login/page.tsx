
import { LoginForm } from "@/components/auth/login-form";

function hasSubdomain(): boolean {
  if (typeof window === "undefined") return false;
  const parts = window.location.hostname.split(".");
  // Require at least 3 parts (e.g. acme.tasksmgr.solutions)
  if (parts.length >= 3 && parts[0] !== "www") return true;
  // Local dev: allow ?__tenant=slug
  const params = new URLSearchParams(window.location.search);
  return !!params.get("__tenant");
}

export default function LoginPage() {
  // SSR fallback: show nothing
  if (typeof window === "undefined") return null;
  if (!hasSubdomain()) {
    return (
      <div className="mt-20 text-center text-lg text-red-500">
        Login is only available from a tenant subdomain.<br />
        Please access via <b>https://[your-company].tasksmgr.solutions</b>.<br />
        If you are an admin, use the admin portal.
      </div>
    );
  }
  return <LoginForm />;
}
