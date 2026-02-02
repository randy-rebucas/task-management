import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("Email not configured. Skipping email send.");
    return;
  }

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || "noreply@taskmanagement.com",
    to: params.to,
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}
