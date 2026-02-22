import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/features/auth/validators";
import { getTenantModelsFromRequest } from "@/features/auth/api-helpers";

export async function POST(req: NextRequest) {
  const tenantCtx = await getTenantModelsFromRequest(req);
  if (!tenantCtx) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 400 });
  }
  const { models } = tenantCtx;

  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const user = await models.User.findOne({ passwordResetToken: parsed.data.token });
  if (!user || !(user as any).passwordResetExpires || (user as any).passwordResetExpires < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  (user as any).password = parsed.data.password;
  (user as any).passwordResetToken = undefined;
  (user as any).passwordResetExpires = undefined;
  await (user as any).save();

  return NextResponse.json({ message: "Password reset successful" });
}
