/**
 * SMS service using Twilio.
 * Credentials are loaded from the platform DB (set via the install wizard
 * or admin settings panel) with env var fallbacks.
 */
import { getPlatformConfig } from "@/lib/platform-config";

export async function sendSms(params: {
  to: string;
  body: string;
}): Promise<{ success: boolean; sid?: string; error?: string }> {
  const { sms } = await getPlatformConfig();

  if (!sms.accountSid || !sms.authToken || !sms.fromNumber) {
    console.warn("[sms] Twilio not configured. Skipping SMS send.");
    return { success: false, error: "SMS not configured" };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${sms.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: sms.fromNumber,
      To: params.to,
      Body: params.body,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sms.accountSid}:${sms.authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const data = (await res.json()) as { sid?: string; message?: string; code?: number };

    if (!res.ok) {
      console.error("[sms] Twilio error:", data);
      return { success: false, error: data.message ?? `HTTP ${res.status}` };
    }

    return { success: true, sid: data.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[sms] Send failed:", message);
    return { success: false, error: message };
  }
}

/** Returns true if SMS is configured and ready to use. */
export async function isSmsConfigured(): Promise<boolean> {
  const { sms } = await getPlatformConfig();
  return Boolean(sms.accountSid && sms.authToken && sms.fromNumber);
}
