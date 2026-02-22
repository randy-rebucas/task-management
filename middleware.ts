import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { RESERVED_SUBDOMAINS } from "@/config/constants";

// Explicitly use Node.js runtime (required for Mongoose DB calls)
export const runtime = "nodejs";

// ── Install-check cache ────────────────────────────────────────────────────────
// Cached so we only hit the DB once per process lifetime.
// Reset on server restart (which is fine — newly deployed code means a fresh check).
let _installChecked = false;
let _installCompleted = false;

async function isInstallCompleted(): Promise<boolean> {
  if (_installChecked) return _installCompleted;
  try {
    const { getPlatformDb } = await import("@/lib/platform-db");
    const { getPlatformSettingModel } = await import("@/models/platform/PlatformSetting");
    const conn = await getPlatformDb();
    const Setting = getPlatformSettingModel(conn);
    const record = await Setting.findOne({ key: "install.completed" }).lean() as
      | { value: unknown }
      | null;
    _installCompleted = record?.value === true;
  } catch {
    // DB unreachable → treat as not yet installed
    _installCompleted = false;
  }
  // Only cache positively — once completed we never need to re-check.
  // While still incomplete, re-query each request so the wizard completion
  // is reflected immediately without a server restart.
  if (_installCompleted) _installChecked = true;
  return _installCompleted;
}

/**
 * Extract the tenant subdomain from the host header.
 * Only treats a hostname as having a subdomain if it belongs to the app domain
 * (e.g. acme.tasksmgr.solutions). Any other host (localhost, ngrok, Vercel
 * preview URLs, etc.) is treated as the apex — no subdomain.
 */
function extractSubdomain(host: string, appDomain: string): string | null {
  const hostname = host.split(":")[0];
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;

  // Only extract subdomain for our own domain
  const suffix = `.${appDomain}`;
  if (!hostname.endsWith(suffix)) return null;

  const sub = hostname.slice(0, hostname.length - suffix.length);
  // Must be a single-level subdomain (no dots)
  if (!sub || sub.includes(".")) return null;
  return sub;
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  // ── Pass through static assets (before any redirect logic) ───────────────
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // ── Install gate ──────────────────────────────────────────────────────────
  // Allow the install wizard and its API routes to load freely.
  // For every other request, redirect to /install if setup is not yet complete.
  const isInstallRoute =
    pathname.startsWith("/install") || pathname.startsWith("/api/install");

  if (!isInstallRoute) {
    const completed = await isInstallCompleted();
    if (!completed) {
      return NextResponse.redirect(new URL("/install", req.url));
    }
  }

  // ── Enforce www on apex domain ────────────────────────────────────────────
  // Redirect tasksmgr.solutions → www.tasksmgr.solutions (301 permanent)
  const hostname = host.split(":")[0];
  // Strip any accidental "www." prefix — domain must be the bare root (e.g. tasksmgr.solutions)
  const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? "tasksmgr.solutions").replace(/^www\./, "");
  if (hostname === appDomain) {
    const url = req.nextUrl.clone();
    url.hostname = `www.${appDomain}`;
    return NextResponse.redirect(url, { status: 301 });
  }

  // Support ?__tenant=slug for local development override
  const subdomainOverride = req.nextUrl.searchParams.get("__tenant");
  const subdomain =
    subdomainOverride ?? req.headers.get("x-tenant-slug") ?? extractSubdomain(host, appDomain);

  // ── Super-admin panel (admin.yourdomain.com) ───────────────────────────────
  if (subdomain === "admin") {
    // Rewrite /anything → /admin/anything so (admin) folder handles it
    // The admin shell handles its own secret-based authentication
    const url = req.nextUrl.clone();
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/")) {
      url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // ── No subdomain → apex / platform pages ──────────────────────────────────
  if (!subdomain || RESERVED_SUBDOMAINS.has(subdomain)) {
    // Landing page, /register-company, /pricing etc. served normally
    return NextResponse.next();
  }

  // ── Tenant subdomain → look up tenant in platform DB ─────────────────────
  try {
    const { getPlatformDb } = await import("@/lib/platform-db");
    const getTenantModel = (await import("@/models/platform/Tenant")).default;
    const platformDb = await getPlatformDb();
    const Tenant = getTenantModel(platformDb);
    const tenant = await Tenant.findOne({ slug: subdomain }).lean();

    if (!tenant) {
      return NextResponse.rewrite(new URL("/tenant-not-found", req.url));
    }

    if (tenant.status === "suspended" || tenant.status === "cancelled") {
      return NextResponse.rewrite(new URL("/tenant-suspended", req.url));
    }

    // Inject tenant context into request headers
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-tenant-id",   tenant._id.toString());
    requestHeaders.set("x-tenant-slug", tenant.slug);
    requestHeaders.set("x-tenant-db",   tenant.dbName);
    requestHeaders.set("x-tenant-name", tenant.name);

    // Auth gate for protected (dashboard) routes
    const isOnAuth =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/forgot-password") ||
      pathname.startsWith("/reset-password");

    // Platform API routes don't need the auth gate here (handled by withTenantAuth)
    if (pathname.startsWith("/api/")) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    const session = await auth();

    // ── Cross-tenant protection ───────────────────────────────────────────────
    // The session cookie is scoped to .tasksmgr.solutions so a session from
    // acme.tasksmgr.solutions is technically valid on beta.tasksmgr.solutions.
    // Reject any session whose tenantSlug does not match the current subdomain.
    const sessionTenant = session?.user?.tenantSlug;
    const isWrongTenant = session?.user && sessionTenant !== subdomain;

    if (!isOnAuth && (!session?.user || isWrongTenant)) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Only redirect to dashboard if the session belongs to THIS tenant
    if (isOnAuth && session?.user && !isWrongTenant) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (err) {
    console.error("[middleware] Tenant resolution failed:", err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json).*)",
  ],
};
