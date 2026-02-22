import { NextRequest, NextResponse } from "next/server";
import { getPlatformDb } from "@/lib/platform-db";
import { getPlatformSettingModel } from "@/models/platform/PlatformSetting";

interface InstallPayload {
  // Email
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  // PayPal
  paypal_plan_starter_id: string;
  paypal_plan_growth_id: string;
  paypal_plan_business_id: string;
  paypal_webhook_id: string;
  // SMS
  sms_account_sid: string;
  sms_auth_token: string;
  sms_from_number: string;
  // AI
  ai_anthropic_api_key: string;
  // Platform
  support_email: string;
  trial_duration_days: number;
}

/**
 * POST /api/install/complete
 * Saves all initial platform settings and marks the install as completed.
 * Guards itself: once completed once, refuses further calls.
 */
export async function POST(req: NextRequest) {
  try {
    const conn = await getPlatformDb();
    const Setting = getPlatformSettingModel(conn);

    // Guard: refuse if already completed
    const existing = await Setting.findOne({ key: "install.completed" }).lean() as
      | { value: unknown }
      | null;
    if (existing?.value === true) {
      return NextResponse.json(
        { error: "Install already completed. Remove or disable this route for security." },
        { status: 403 }
      );
    }

    const body = (await req.json()) as Partial<InstallPayload>;

    // Build the list of key/value pairs to upsert
    const updates: Array<{ key: string; value: unknown }> = [
      // Email
      { key: "smtp.host",     value: body.smtp_host     ?? "" },
      { key: "smtp.port",     value: body.smtp_port     ?? 587 },
      { key: "smtp.user",     value: body.smtp_user     ?? "" },
      { key: "smtp.password", value: body.smtp_password ?? "" },
      { key: "smtp.from",     value: body.smtp_from     ?? "" },
      // PayPal
      { key: "paypal.plan.starter.id",  value: body.paypal_plan_starter_id  ?? "" },
      { key: "paypal.plan.growth.id",   value: body.paypal_plan_growth_id   ?? "" },
      { key: "paypal.plan.business.id", value: body.paypal_plan_business_id ?? "" },
      { key: "paypal.webhook.id",       value: body.paypal_webhook_id       ?? "" },
      // SMS
      { key: "sms.account_sid",  value: body.sms_account_sid  ?? "" },
      { key: "sms.auth_token",   value: body.sms_auth_token   ?? "" },
      { key: "sms.from_number",  value: body.sms_from_number  ?? "" },
      // AI
      { key: "ai.anthropic_api_key", value: body.ai_anthropic_api_key ?? "" },
      // Platform
      { key: "support_email",       value: body.support_email       ?? "" },
      { key: "trial_duration_days", value: body.trial_duration_days ?? 14 },
      // Mark complete — must be last
      { key: "install.completed", value: true },
    ];

    await Promise.all(
      updates.map(({ key, value }) =>
        Setting.findOneAndUpdate(
          { key },
          { $set: { key, value } },
          { upsert: true, new: true }
        )
      )
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[install/complete]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
