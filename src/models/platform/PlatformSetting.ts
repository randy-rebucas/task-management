import mongoose, { Schema, Model, Connection } from "mongoose";

export interface IPlatformSetting {
  key: string;
  value: unknown;
  description: string;
  group: string;
  updatedAt: Date;
}

const PlatformSettingSchema = new Schema<IPlatformSetting>(
  {
    key:         { type: String, required: true, unique: true },
    value:       { type: Schema.Types.Mixed, required: true },
    description: { type: String, default: "" },
    group:       { type: String, default: "general" },
  },
  { timestamps: true }
);

export type SettingDef = {
  key: string;
  value: unknown;
  description: string;
  group: string;
};

export const DEFAULT_PLATFORM_SETTINGS: SettingDef[] = [
  // General
  { key: "maintenance_mode",      value: false,     description: "Block all tenant access with a maintenance page",    group: "general" },
  { key: "trial_duration_days",   value: 14,        description: "Default trial period length in days",                group: "general" },
  { key: "new_tenant_plan",       value: "trial",   description: "Default plan assigned to new tenants",               group: "general" },
  { key: "support_email",         value: "",        description: "Support email shown to tenants",                     group: "general" },
  // Features
  { key: "feature.self_registration", value: true,  description: "Allow new companies to register via /register-company", group: "features" },
  { key: "feature.paypal_billing",    value: true,  description: "Enable PayPal subscription billing",                     group: "features" },
  { key: "feature.crm_module",        value: true,  description: "Enable the CRM module for all tenants",                  group: "features" },
  { key: "feature.field_module",      value: true,  description: "Enable the field operations module",                     group: "features" },
  { key: "feature.ai_summaries",      value: false, description: "Enable AI-generated daily field summaries",              group: "features" },
  // Plan limits (maxUsers per plan)
  { key: "plan_limits.trial",      value: 5,    description: "Max users on the trial plan",      group: "plans" },
  { key: "plan_limits.starter",    value: 25,   description: "Max users on the starter plan",    group: "plans" },
  { key: "plan_limits.growth",     value: 50,   description: "Max users on the growth plan",     group: "plans" },
  { key: "plan_limits.business",   value: 150,  description: "Max users on the business plan",   group: "plans" },
  { key: "plan_limits.enterprise", value: 9999, description: "Max users on the enterprise plan", group: "plans" },
  // Plan pricing (USD/month)
  { key: "plan_price.starter",    value: 49,  description: "Monthly price for Starter plan (USD)",    group: "plans" },
  { key: "plan_price.growth",     value: 149, description: "Monthly price for Growth plan (USD)",     group: "plans" },
  { key: "plan_price.business",   value: 299, description: "Monthly price for Business plan (USD)",   group: "plans" },
  { key: "plan_price.enterprise", value: 0,   description: "Monthly price for Enterprise plan (0 = custom pricing)", group: "plans" },
  // Plan labels
  { key: "plan_label.trial",      value: "Trial",      description: "Display label for the trial plan",      group: "plans" },
  { key: "plan_label.starter",    value: "Starter",    description: "Display label for the starter plan",    group: "plans" },
  { key: "plan_label.growth",     value: "Growth",     description: "Display label for the growth plan",     group: "plans" },
  { key: "plan_label.business",   value: "Business",   description: "Display label for the business plan",   group: "plans" },
  { key: "plan_label.enterprise", value: "Enterprise", description: "Display label for the enterprise plan", group: "plans" },
  // PayPal
  { key: "paypal.plan.starter.id",  value: "", description: "PayPal plan ID for Starter plan",  group: "paypal" },
  { key: "paypal.plan.growth.id",   value: "", description: "PayPal plan ID for Growth plan",   group: "paypal" },
  { key: "paypal.plan.business.id", value: "", description: "PayPal plan ID for Business plan", group: "paypal" },
  { key: "paypal.webhook.id",       value: "", description: "PayPal Webhook ID for signature verification", group: "paypal" },
  // Email / SMTP
  { key: "smtp.host",     value: "", description: "SMTP server hostname (e.g. smtp.gmail.com)",    group: "email" },
  { key: "smtp.port",     value: 587, description: "SMTP port (587 for TLS, 465 for SSL)",         group: "email" },
  { key: "smtp.user",     value: "", description: "SMTP authentication username / email address",   group: "email" },
  { key: "smtp.password", value: "", description: "SMTP authentication password or app password",  group: "email" },
  { key: "smtp.from",     value: "", description: "Default sender address (e.g. noreply@domain.com)", group: "email" },
  // SMS (Twilio)
  { key: "sms.provider",     value: "twilio", description: "SMS provider (currently: twilio)",      group: "sms" },
  { key: "sms.account_sid",  value: "", description: "Twilio Account SID",                          group: "sms" },
  { key: "sms.auth_token",   value: "", description: "Twilio Auth Token",                           group: "sms" },
  { key: "sms.from_number",  value: "", description: "Twilio sender phone number (E.164 format)",   group: "sms" },
  // AI
  { key: "ai.anthropic_api_key", value: "", description: "Anthropic Claude API key for AI features", group: "ai" },
  // Install
  { key: "install.completed", value: false, description: "Whether the initial platform setup wizard has been completed", group: "install" },
];

export function getPlatformSettingModel(conn: Connection): Model<IPlatformSetting> {
  return (conn.models.PlatformSetting as Model<IPlatformSetting>) ??
    conn.model<IPlatformSetting>("PlatformSetting", PlatformSettingSchema);
}
