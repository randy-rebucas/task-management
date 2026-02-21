export { auth as middleware } from "@/lib/auth";

// Explicitly disable Edge runtime for this middleware
export const runtime = "nodejs";

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
