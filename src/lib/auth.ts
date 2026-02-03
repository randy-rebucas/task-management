import "@/models/Role";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import LoginHistory from "@/models/LoginHistory";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await dbConnect();

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
          }).catch(() => {});
          return null;
        }

        const isValid = await user.comparePassword(credentials.password as string);
        if (!isValid) {
          await LoginHistory.create({
            user: user._id,
            success: false,
            failureReason: "Invalid password",
          }).catch(() => {});
          return null;
        }

        await LoginHistory.create({
          user: user._id,
          success: true,
        }).catch(() => {});

        await User.findByIdAndUpdate(user._id, {
          lastLoginAt: new Date(),
        });

        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          roles: (user.roles as { _id: unknown }[]).map((r) =>
            typeof r._id === "string"
              ? r._id
              : (r._id as any)?.toString?.() ?? ""
          ),
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.roles = (user as unknown as { roles: string[] }).roles;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.roles = token.roles as string[];
      return session;
    },
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isOnAuth = nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/forgot-password") ||
        nextUrl.pathname.startsWith("/reset-password");

      if (isOnAuth) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl));
        return true;
      }

      if (!isLoggedIn) {
        return false; // Redirect to login
      }

      return true;
    },
  },
  pages: {
    signIn: "/login",
  },
});
