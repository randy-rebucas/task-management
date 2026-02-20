import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import User from "@/models/User";
import { forgotPasswordSchema } from "@/lib/validators";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  await dbConnect();
  const body = await req.json();
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const user = await User.findOne({ email: parsed.data.email });
  if (!user) {
    // Always return success to avoid user enumeration
    return NextResponse.json({ message: "If an account exists, a reset link was sent." });
  }

  // Generate token
  const token = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = token;
  user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
  await user.save();

  const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

  await sendEmail({
    to: user.email,
    subject: "Password Reset Request",
    text: `Reset your password: ${resetUrl}`,
    html: `<p>Click <a href='${resetUrl}'>here</a> to reset your password.</p>`,
  });

  return NextResponse.json({ message: "If an account exists, a reset link was sent." });
}
