/**
 * Platform configuration loader.
 *
 * Reads all platform settings from the platform DB and returns them as a
 * structured, typed config object. Env vars are used as fallbacks so the
 * app works even before the install wizard is run (e.g. local dev with a
 * pre-populated .env.local).
 *
 * Caching: the config is cached in memory for TTL_MS milliseconds so that
 * changes made in the admin settings panel propagate within that window
 * without requiring a server restart.
 */

import { logger } from "@/lib/logger";
import { getPlatformDb } from "@/lib/platform-db";
import { getPlatformSettingModel } from "@/models/platform/PlatformSetting";

const log = logger.child({ module: "platform-config" });

// ── Cache ──────────────────────────────────────────────────────────────────────

const TTL_MS = 60_000; // 1 minute
let _cache: PlatformConfig | null = null;
let _cacheAt = 0;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
}

export interface SmsConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

export interface AiConfig {
  anthropicApiKey: string;
}

export interface PaypalConfig {
  planStarterId: string;
  planGrowthId: string;
  planBusinessId: string;
  webhookId: string;
}

export interface FeatureFlags {
  selfRegistration: boolean;
  paypalBilling: boolean;
  crmModule: boolean;
  fieldModule: boolean;
  aiSummaries: boolean;
}

export interface PlanLimits {
  trial: number;
  starter: number;
  growth: number;
  business: number;
  enterprise: number;
}

export interface PlatformConfig {
  maintenanceMode: boolean;
  trialDurationDays: number;
  newTenantPlan: string;
  supportEmail: string;
  smtp: SmtpConfig;
  sms: SmsConfig;
  ai: AiConfig;
  paypal: PaypalConfig;
  features: FeatureFlags;
  planLimits: PlanLimits;
}

// ── Loader ─────────────────────────────────────────────────────────────────────

function str(map: Map<string, unknown>, key: string, fallback = ""): string {
  const v = map.get(key);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : fallback;
}

function num(map: Map<string, unknown>, key: string, fallback: number): number {
  const v = map.get(key);
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(map: Map<string, unknown>, key: string, fallback: boolean): boolean {
  const v = map.get(key);
  if (typeof v === "boolean") return v;
  return fallback;
}

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const now = Date.now();
  if (_cache && now - _cacheAt < TTL_MS) return _cache;

  let map = new Map<string, unknown>();

  try {
    const conn = await getPlatformDb();
    const Setting = getPlatformSettingModel(conn);
    const rows = await Setting.find({}).lean() as { key: string; value: unknown }[];
    for (const r of rows) map.set(r.key, r.value);
  } catch (err) {
    log.warn({ err }, "Could not load settings from DB, using env var fallbacks");
  }

  const config: PlatformConfig = {
    maintenanceMode:  bool(map, "maintenance_mode",    false),
    trialDurationDays: num(map, "trial_duration_days", 14),
    newTenantPlan:    str(map, "new_tenant_plan",       "trial"),
    supportEmail:     str(map, "support_email",         process.env.SUPPORT_EMAIL ?? ""),

    smtp: {
      host:     str(map, "smtp.host",     process.env.SMTP_HOST     ?? "smtp.gmail.com"),
      port:     num(map, "smtp.port",     parseInt(process.env.SMTP_PORT ?? "587")),
      user:     str(map, "smtp.user",     process.env.SMTP_USER     ?? ""),
      password: str(map, "smtp.password", process.env.SMTP_PASS     ?? ""),
      from:     str(map, "smtp.from",     process.env.EMAIL_FROM    ?? "noreply@taskmanagement.com"),
    },

    sms: {
      accountSid:  str(map, "sms.account_sid",  process.env.TWILIO_ACCOUNT_SID  ?? ""),
      authToken:   str(map, "sms.auth_token",   process.env.TWILIO_AUTH_TOKEN   ?? ""),
      fromNumber:  str(map, "sms.from_number",  process.env.TWILIO_FROM_NUMBER  ?? ""),
    },

    ai: {
      anthropicApiKey: str(map, "ai.anthropic_api_key", process.env.ANTHROPIC_API_KEY ?? ""),
    },

    paypal: {
      planStarterId:  str(map, "paypal.plan.starter.id",  process.env.PAYPAL_PLAN_STARTER_ID  ?? ""),
      planGrowthId:   str(map, "paypal.plan.growth.id",   process.env.PAYPAL_PLAN_GROWTH_ID   ?? ""),
      planBusinessId: str(map, "paypal.plan.business.id", process.env.PAYPAL_PLAN_BUSINESS_ID ?? ""),
      webhookId:      str(map, "paypal.webhook.id",       process.env.PAYPAL_WEBHOOK_ID       ?? ""),
    },

    features: {
      selfRegistration: bool(map, "feature.self_registration", true),
      paypalBilling:    bool(map, "feature.paypal_billing",    true),
      crmModule:        bool(map, "feature.crm_module",        true),
      fieldModule:      bool(map, "feature.field_module",      true),
      aiSummaries:      bool(map, "feature.ai_summaries",      false),
    },

    planLimits: {
      trial:      num(map, "plan_limits.trial",      5),
      starter:    num(map, "plan_limits.starter",    25),
      growth:     num(map, "plan_limits.growth",     50),
      business:   num(map, "plan_limits.business",   150),
      enterprise: num(map, "plan_limits.enterprise", 9999),
    },
  };

  _cache = config;
  _cacheAt = now;
  return config;
}

/** Invalidate the in-memory cache (call this after saving settings in the admin panel). */
export function invalidatePlatformConfigCache() {
  _cache = null;
  _cacheAt = 0;
}
