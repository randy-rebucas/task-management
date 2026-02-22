import { NextRequest, NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/features/auth/validators";
import { sendEmail } from "@/lib/email";
import { getTenantModelsFromRequest } from "@/features/auth/api-helpers";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const tenantCtx = await getTenantModelsFromRequest(req);
  if (!tenantCtx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
  }
  const { models } = tenantCtx;

  const body = await req.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const user = await models.User.findOne({ email: parsed.data.email });
  if (!user) {
    return NextResponse.json({ message: "If an account exists, a reset link was sent." });
  }

  const token = crypto.randomBytes(32).toString("hex");
  (user as any).passwordResetToken = token;
  (user as any).passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60);
  await (user as any).save();

  // Build reset URL based on the subdomain host (tenant context)
  const host = req.headers.get("host") ?? process.env.NEXTAUTH_URL ?? "localhost:3000";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const resetUrl = `${proto}://${host}/reset-password?token=${token}`;

  await sendEmail({
    to: (user as any).email,
    subject: "Password Reset Request",
    text: `Reset your password: ${resetUrl}`,
    html: `<p>Click <a href='${resetUrl}'>here</a> to reset your password.</p>`,
  });

  return NextResponse.json({ message: "If an account exists, a reset link was sent." });
}
