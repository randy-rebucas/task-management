import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), payment=()",
  },
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // ── API versioning ──────────────────────────────────────────────────
      // /api/v1/* transparently maps to the current /api/* routes.
      // When a v2 is introduced, add a new rewrite block before this one.
      {
        source: "/api/v1/:path*",
        destination: "/api/:path*",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // Allow images from any subdomain of the configured app domain
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `**.${process.env.NEXT_PUBLIC_APP_DOMAIN ?? "yourdomain.com"}`,
      },
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_APP_DOMAIN ?? "yourdomain.com",
      },
    ],
  },
};

export default nextConfig;
