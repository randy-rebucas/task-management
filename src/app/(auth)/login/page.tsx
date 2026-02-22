import { LoginForm } from "@/components/auth/login-form";

// Subdomain validation is enforced by middleware before this page renders.
// If a user reaches this page without a valid tenant subdomain, middleware
// already rewrites them to /tenant-not-found.
export default function LoginPage() {
  return <LoginForm />;
}
