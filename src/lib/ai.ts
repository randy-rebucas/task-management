/**
 * AI helper — provides the Anthropic API key and a ready-to-use client
 * factory loaded from the platform DB (with env var fallback).
 *
 * Usage:
 *   const client = await getAnthropicClient();
 *   if (!client) { // AI not configured }
 *   const msg = await client.messages.create(...)
 */
import { logger } from "@/lib/logger";
import { getPlatformConfig } from "@/lib/platform-config";

const log = logger.child({ module: "ai" });

/**
 * Returns the Anthropic API key from the platform DB or env var.
 * Returns an empty string if not configured.
 */
export async function getAnthropicApiKey(): Promise<string> {
  const { ai } = await getPlatformConfig();
  return ai.anthropicApiKey;
}

/**
 * Returns a configured Anthropic SDK client, or null if no API key is set.
 * Dynamically imports the SDK so the module can be tree-shaken when AI is
 * not used.
 */
export async function getAnthropicClient() {
  const apiKey = await getAnthropicApiKey();
  if (!apiKey) {
    log.warn("Anthropic API key not configured — AI summary disabled");
    return null;
  }

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    return new Anthropic({ apiKey });
  } catch {
    log.error("@anthropic-ai/sdk not installed — run: pnpm add @anthropic-ai/sdk");
    return null;
  }
}

/** Returns true if an Anthropic API key is present. */
export async function isAiConfigured(): Promise<boolean> {
  const key = await getAnthropicApiKey();
  return key.length > 0;
}
