import nodemailer from "nodemailer";
import { getPlatformConfig } from "@/lib/platform-config";

/**
 * Send an email using SMTP credentials loaded from the platform DB
 * (with env var fallbacks for local dev / pre-install).
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const { smtp } = await getPlatformConfig();

  if (!smtp.user || !smtp.password) {
    console.warn("[email] SMTP not configured. Skipping email send.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.password },
  });

  return transporter.sendMail({
    from: smtp.from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}
