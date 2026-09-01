import nodemailer from "nodemailer";
import { config } from "./config.js";

export function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  });
}

const FROM = process.env.EMAIL_FROM || process.env.SMTP_USER!;

// Hard guard against bulk spam: real sends only when EMAIL_LIVE=true, and a
// cap of MAX_EMAILS_PER_RUN per unique recipient so a stray cron run can never
// fire a burst to one inbox. Without EMAIL_LIVE the call is logged and skipped.
const EMAIL_LIVE = process.env.EMAIL_LIVE === "true";
const MAX_EMAILS_PER_RUN = parseInt(process.env.MAX_EMAILS_PER_RUN || "5", 10);
const sentCounts = new Map<string, number>();

export async function sendEmail(to: string, subject: string, html: string) {
  if (!EMAIL_LIVE) {
    console.warn(`[email] LIVE sends disabled (EMAIL_LIVE!=true); skipped -> ${to}: ${subject}`);
    return { messageId: "dry-run" };
  }
  const seen = sentCounts.get(to) || 0;
  if (seen >= MAX_EMAILS_PER_RUN) {
    console.warn(`[email] cap reached (${MAX_EMAILS_PER_RUN}) for ${to}; skipping: ${subject}`);
    return { messageId: "capped" };
  }
  sentCounts.set(to, seen + 1);
  return getTransporter().sendMail({ from: FROM, to, subject, html });
}

export function baseHtml(body: string): string {
  const content = body.replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /></head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:14px; line-height:1.6; color:#F4F4F4; background:#0C0C0C; margin:0; padding:0;">
    <div style="max-width:600px; margin:0 auto; padding:40px 24px;">
      <div style="text-align:center; margin-bottom:32px;">
        <span style="font-family: Georgia, 'Times New Roman', serif; font-size:20px; font-weight:600; color:#F4F4F4; margin:0;">${config.clinicName}</span>
        <p style="font-size:11px; letter-spacing:2px; text-transform:uppercase; color:#F5A623; margin:4px 0 0;">Gentle Premium Dental Care</p>
      </div>
      <div style="background:#141414; border:1px solid #2A2A2A; border-radius:16px; padding:32px 28px;">
${content}
      </div>
      <div style="text-align:center; margin-top:24px; font-size:11px; color:#555555;">
        <p>${config.clinicAddress}, ${config.clinicCity}</p>
        <p>${config.clinicPhone}</p>
      </div>
    </div>
  </body>
</html>`;
}