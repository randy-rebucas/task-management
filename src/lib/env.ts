/**
 * Validated environment variables.
 *
 * Import this module instead of `process.env` wherever a required secret is
 * needed on the server side.  A clear error is thrown at startup if any
 * required variable is missing or malformed — no more silent failures.
 *
 * Optional variables (marked `.optional()`) are safe to omit and will
 * return `undefined` rather than throwing.
 */

import { z } from "zod";

const envSchema = z.object({
  // ── Core ─────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // ── Database ─────────────────────────────────────────────────────────────
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  // ── Auth ─────────────────────────────────────────────────────────────────
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),
  NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL").optional(),

  // ── App ──────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_DOMAIN: z.string().optional(),
  SUPER_ADMIN_SECRET: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  // ── SMTP (optional — email is skipped if absent) ──────────────────────────
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  // ── PayPal (optional) ────────────────────────────────────────────────────
  PAYPAL_ENV: z.enum(["sandbox", "live"]).optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_PLAN_STARTER_ID: z.string().optional(),
  PAYPAL_PLAN_GROWTH_ID: z.string().optional(),
  PAYPAL_PLAN_BUSINESS_ID: z.string().optional(),

  // ── AI (optional) ────────────────────────────────────────────────────────
  ANTHROPIC_API_KEY: z.string().optional(),

  // ── File Storage ─────────────────────────────────────────────────────────
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  AWS_S3_CDN_URL: z.string().url().optional(),

  // ── Misc ─────────────────────────────────────────────────────────────────
  FIELD_INACTIVE_HOURS: z.coerce.number().default(8),
  ESCALATION_DAYS: z.coerce.number().default(3),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

// Parse once at module load. On failure, an informative ZodError is thrown
// before the server ever starts accepting requests.
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  const issues = _parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `\n\n❌  Invalid environment variables:\n${issues}\n\n` +
    `Check your .env.local file against .env.example.\n`
  );
}

export const env = _parsed.data;
