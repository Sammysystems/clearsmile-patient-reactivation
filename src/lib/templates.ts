import { baseHtml } from "./email.js";
import { config } from "./config.js";

const BOOKING_URL = config.bookingUrlBase;

const cta = (label: string, href: string) => `
  <div style="text-align:center; margin:24px 0;">
    <a href="${href}" style="display:inline-block; background:#F5A623; color:#0C0C0C; padding:14px 32px; border-radius:9999px; text-decoration:none; font-size:12px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase;">${label}</a>
  </div>`;

function details(date: string, time: string) {
  return `
    <div style="background:#0C0C0C; border:1px solid #2A2A2A; border-radius:12px; padding:20px; margin:20px 0;">
      <p style="margin:0 0 8px; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#F5A623; font-weight:600;">Appointment Details</p>
      <p style="margin:0; font-size:16px; font-weight:600; color:#F4F4F4;"><strong>Date:</strong> ${date}</p>
      <p style="margin:4px 0 0; font-size:16px; font-weight:600; color:#F4F4F4;"><strong>Time:</strong> ${time}</p>
    </div>`;
}

const signoff = (extra?: string) => `
  <p style="margin:0; font-size:12px; color:#555555;">${config.clinicName} · ${config.clinicPhone}${extra ? " · " + extra : ""}</p>`;

export function reactivation1(name: string) {
  const subject = "We've missed you — time for your check-up";
  const body = `
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">It's been a little while since your last visit, and our team wants to make sure your smile stays in great shape.</p>
    <p style="margin:0 0 16px;">A routine check-up and clean is the best way to catch small issues before they become big ones. We'd love to see you again soon.</p>
    ${cta("Book Your Check-Up", BOOKING_URL)}
    <p style="margin:0 0 16px;">Pick a time that suits you — it takes less than a minute. We also have Saturday and evening appointments available.</p>
    ${signoff()}
  `;
  return { subject, html: baseHtml(body) };
}

export function reactivation2(name: string) {
  const subject = "We're still holding a spot for you";
  const body = `
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">Just a gentle reminder that your check-up is due. We're keeping space open for you because your smile matters to us.</p>
    <p style="margin:0 0 16px;">It's quick, gentle, and completely judgment-free — just how dental care should be.</p>
    ${cta("Reserve Your Spot", BOOKING_URL)}
    <p style="margin:0 0 16px;">If now isn't the right time, no worries — just let us know and we'll leave you be.</p>
    ${signoff()}
  `;
  return { subject, html: baseHtml(body) };
}

export function reactivation3(name: string) {
  const subject = "Last call — don't miss out";
  const body = `
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">This is our last nudge for now. We'd really love to see you back for your routine check-up.</p>
    <p style="margin:0 0 16px;">If you're not planning to return, just reply to this email — we'll stop reaching out. Either way, thank you for trusting us with your smile in the past.</p>
    ${cta("Book Your Check-Up", BOOKING_URL)}
    ${signoff()}
  `;
  return { subject, html: baseHtml(body) };
}

export function bookingConfirmation(name: string, date: string, time: string, service: string) {
  const subject = `You're booked — ${service} on ${date}`;
  const body = `
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">Your appointment is confirmed. We'll be ready for you.</p>
    ${details(date, time)}
    <p style="margin:0 0 16px;"><strong>Service:</strong> ${service}</p>
    <p style="margin:0 0 16px;">Need to reschedule? Just reply to this email or call us at ${config.clinicPhone}.</p>
    ${signoff()}
  `;
  return { subject, html: baseHtml(body) };
}

export function bookingReminder(name: string, date: string, time: string, hoursBefore: number) {
  const subject = hoursBefore <= 1
    ? `Reminder: your visit is in 1 hour`
    : `Reminder: your visit is tomorrow`;
  const body = `
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">A quick reminder about your upcoming appointment — we're looking forward to seeing you.</p>
    ${details(date, time)}
    <p style="margin:0 0 16px;">If you need to reschedule, call us at ${config.clinicPhone}.</p>
    ${signoff()}
  `;
  return { subject, html: baseHtml(body) };
}

export function noShowReschedule(name: string) {
  const subject = "We missed you — let's find a new time";
  const body = `
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">We noticed you weren't able to make your last appointment. Life gets busy — we completely understand.</p>
    <p style="margin:0 0 16px;">The good news is we'd still love to see you. Simply pick a new time that works.</p>
    ${cta("Reschedule Your Visit", BOOKING_URL)}
    ${signoff()}
  `;
  return { subject, html: baseHtml(body) };
}

export function handoffConfirmation(name: string) {
  const subject = "We've received your message";
  const body = `
    <p style="margin:0 0 16px;">Hi ${name},</p>
    <p style="margin:0 0 16px;">We've passed your question to our front desk team — a real person will get back to you shortly (usually within a couple of hours during open hours).</p>
    <p style="margin:0 0 16px;">In the meantime, you can also book your appointment directly whenever you're ready.</p>
    ${cta("Book an Appointment", BOOKING_URL)}
    ${signoff()}
  `;
  return { subject, html: baseHtml(body) };
}