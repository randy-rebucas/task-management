import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Explicitly use Node.js runtime (required for Mongoose DB calls)
export const runtime = "nodejs";

// Reserved subdomains that are not tenant slugs
const RESERVED_SUBDOMAINS = new Set([
  "www", "admin", "api", "app", "mail", "smtp", "ftp", "status", "docs",
]);

/**
 * Extract the subdomain from the host header.
 * Returns null for the apex domain, "www", or IP addresses.
 */
function extractSubdomain(host: string): string | null {
  const hostname = host.split(":")[0];
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;
  if (hostname === "localhost" || hostname === "127.0.0.1") return null;
  const parts = hostname.split(".");
  if (parts.length >= 3) return parts[0];
  return null;
}

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;

  // Pass through static assets and auth API without any modifications
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Support ?__tenant=slug for local development override
  const subdomainOverride = req.nextUrl.searchParams.get("__tenant");
  const subdomain =
    subdomainOverride ?? req.headers.get("x-tenant-slug") ?? extractSubdomain(host);

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
    if (!isOnAuth && !session?.user) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (isOnAuth && session?.user) {
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
