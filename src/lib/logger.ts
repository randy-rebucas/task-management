/**
 * Structured logger using pino.
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   const log = logger.child({ module: "email" });
 *   log.warn("SMTP not configured");
 *   log.error({ err }, "Send failed");
 *
 * In development, output is pretty-printed to the terminal.
 * In production, output is newline-delimited JSON (machine-readable for
 * Vercel log drains, Datadog, etc.).
 */

import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
      },
    },
  }),
});
