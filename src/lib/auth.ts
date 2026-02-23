import "@/models/Role";
import "@/models/LoginHistory";
import { logger } from "@/lib/logger";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getTenantConnection } from "@/lib/tenant-db";
import { getTenantModels } from "@/lib/tenant-models";
import { getPlatformDb } from "@/lib/platform-db";
import getTenantModel from "@/models/platform/Tenant";

const log = logger.child({ module: "auth" });

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantSlug: { label: "Tenant", type: "text" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password) return null;

        // Capture IP and user-agent for login history
        const ipAddress = request?.headers?.get("x-forwarded-for")?.split(",")[0].trim()
          ?? request?.headers?.get("x-real-ip")
          ?? undefined;
        const userAgent = request?.headers?.get("user-agent") ?? undefined;

        // Resolve tenant: from credentials (login form), request headers (set by middleware),
        // or the hostname-derived slug forwarded via x-tenant-slug header.
        let tenantSlug =
          (credentials.tenantSlug as string) ||
          request?.headers?.get("x-tenant-slug") ||
          null;

        // Fallback for local dev: extract from ?__tenant query param
        if (!tenantSlug && request?.url) {
          const url = new URL(request.url);
          tenantSlug = url.searchParams.get("__tenant");
        }

        if (!tenantSlug) {
          log.error("No tenantSlug found during authorize");
          return null;
        }

        // Look up tenant in platform DB
        const platformDb = await getPlatformDb();
        const Tenant = getTenantModel(platformDb);
        const tenant = await Tenant.findOne({
          slug: tenantSlug,
          status: "active",
        }).lean();

        if (!tenant) {
          log.error({ tenantSlug }, "Tenant not found or inactive");
          return null;
        }

        // Get tenant-specific DB and models
        const tenantConn = await getTenantConnection(tenant.dbName);
        const { User, LoginHistory } = getTenantModels(tenantConn);

        const user = await User.findOne({
          email: (credentials.email as string).toLowerCase(),
          isActive: true,
        })
          .select("+password")
          .populate("roles");

        if (!user) {
          await LoginHistory.create({
            success: false,
            failureReason: "User not found",
            ipAddress,
            userAgent,
          }).catch(() => {});
          return null;
        }

        const isValid = await (user as any).comparePassword(
          credentials.password as string
        );
        if (!isValid) {
          await LoginHistory.create({
            user: user._id,
            success: false,
            failureReason: "Invalid password",
            ipAddress,
            userAgent,
          }).catch(() => {});
          return null;
        }

        await LoginHistory.create({ user: user._id, success: true, ipAddress, userAgent }).catch(() => {});
        await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

        return {
          id: user._id.toString(),
          email: (user as any).email,
          name: `${(user as any).firstName} ${(user as any).lastName}`,
          roles: ((user as any).roles as { _id: unknown }[]).map((r) =>
            typeof r._id === "string"
              ? r._id
              : (r._id as any)?.toString?.() ?? ""
          ),
          tenantId:     tenant._id.toString(),
          tenantSlug:   tenant.slug,
          tenantDbName: tenant.dbName,
          tenantName:   tenant.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  // In production, set the session cookie on the root domain so all tenant
  // subdomains (e.g. acme.tasksmgr.solutions) share the same auth session.
  ...(process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_DOMAIN
    ? {
        cookies: {
          sessionToken: {
            name: "__Secure-authjs.session-token",
            options: {
              httpOnly: true,
              sameSite: "lax" as const,
              path: "/",
              secure: true,
              domain: `.${process.env.NEXT_PUBLIC_APP_DOMAIN}`,
            },
          },
        },
      }
    : {}),
  trustHost: true,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId      = user.id;
        token.roles       = (user as any).roles;
        token.tenantId    = (user as any).tenantId;
        token.tenantSlug  = (user as any).tenantSlug;
        token.tenantDbName = (user as any).tenantDbName;
        token.tenantName  = (user as any).tenantName;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id          = token.userId as string;
      session.user.roles       = token.roles as string[];
      session.user.tenantId    = token.tenantId as string;
      session.user.tenantSlug  = token.tenantSlug as string;
      session.user.tenantDbName = token.tenantDbName as string;
      session.user.tenantName  = token.tenantName as string;
      return session;
    },
    authorized({ auth: session }) {
      // Basic check — detailed routing handled in middleware
      return !!session?.user;
    },
  },
  pages: {
    signIn: "/login",
  },
});
