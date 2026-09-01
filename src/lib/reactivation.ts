import { admin } from "./insforge.js";
import { config, FOLLOWUP_DAYS } from "./config.js";
import { sendEmail } from "./email.js";
import {
  reactivation1,
  reactivation2,
  reactivation3,
  bookingReminder,
  noShowReschedule,
} from "./templates.js";

export interface PatientRow {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  last_visit_at: string | null;
  next_due_date?: string | null;
  reactivation_status?: string;
  flagged_at?: string | null;
  opted_out?: boolean;
  status?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  source?: string;
}

export function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  try {
    return d.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/** Build the ISO date used as the overdue cutoff (YYYY-MM-DD). */
export function overdueCutoffIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - config.overdueMonths);
  return d.toISOString().slice(0, 10);
}

/** Build the ISO date used as the recent-contact suppression cutoff. */
export function suppressionCutoffIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - config.suppressionDays);
  return d.toISOString();
}

export async function flagOverduePatients() {
  const cutoff = overdueCutoffIso();
  const suppress = suppressionCutoffIso();

  // Patients with a last_visit older than the cutoff (or undefined) who are not
  // already in a reactivation campaign, not opted out, and not recently contacted.
  const { data, error } = await admin.database
    .from("patient")
    .select("id, name, email, last_visit_at, reactivation_status")
    .or(
      `and(last_visit_at.lt.${cutoff},reactivation_status.in.(none,booked,suppressed,opted_out)),` +
        `and(last_visit_at.is.null,reactivation_status.in.(none,booked,suppressed,opted_out)),` +
        `and(last_visit_at.lt.${cutoff},reactivation_status.is.null),` +
        `and(last_visit_at.is.null,reactivation_status.is.null)`
    )
    .limit(500);

  if (error) throw error;

  let flagged = 0;
  for (const patient of data || []) {
    if (!patient.email) continue;

    const { data: followups } = await admin.database
      .from("followup")
      .select("id")
      .eq("patient_id", patient.id)
      .eq("type", "reactivation")
      .limit(1);

    if (followups && followups.length > 0) continue;

    const { data: recent } = await admin.database
      .from("emaillog")
      .select("created_at")
      .eq("patient_id", patient.id)
      .gte("created_at", suppress)
      .limit(1);

    if (recent && recent.length > 0) continue;

    const { error: updateError } = await admin.database
      .from("patient")
      .update({ reactivation_status: "overdue", flagged_at: new Date().toISOString() })
      .eq("id", patient.id);

    if (updateError) throw updateError;
    flagged++;
  }

  return { flagged };
}

export async function processFollowups() {
  const { data, error } = await admin.database
    .from("patient")
    .select("id, name, email, flagged_at, reactivation_status")
    .in("reactivation_status", ["overdue", "contacted"])
    .not("email", "is", null)
    .limit(100);

  if (error) throw error;

  let processed = 0;
  for (const patient of data || []) {
    if (!patient.email || !patient.flagged_at) continue;

    const { data: followups } = await admin.database
      .from("followup")
      .select("step")
      .eq("patient_id", patient.id)
      .eq("type", "reactivation");

    const doneSteps = new Set((followups || []).map((f) => f.step));
    const flaggedTime = new Date(patient.flagged_at).getTime();
    const now = Date.now();

    for (let i = 0; i < FOLLOWUP_DAYS.length; i++) {
      const step = i + 1;
      const dayOffset = FOLLOWUP_DAYS[i];
      const dueTime = flaggedTime + dayOffset * 24 * 60 * 60 * 1000;
      if (doneSteps.has(step)) continue;
      if (now < dueTime) continue;

      const template = [reactivation1, reactivation2, reactivation3][i];
      const { subject, html } = template(patient.name);

      try {
        await sendEmail(patient.email, subject, html);
        await admin.database.from("followup").insert([
          { patient_id: patient.id, step, type: "reactivation" },
        ]);
        await admin.database.from("emaillog").insert([
          { patient_id: patient.id, type: `reactivation_${step}`, subject, status: "sent" },
        ]);
        await admin.database
          .from("patient")
          .update({ reactivation_status: "contacted" })
          .eq("id", patient.id);
        processed++;
        break;
      } catch (emailErr) {
        await admin.database.from("emaillog").insert([
          {
            patient_id: patient.id,
            type: `reactivation_${step}`,
            subject,
            status: "error",
            error: String(emailErr),
          },
        ]);
        break;
      }
    }

    // Sequence complete (all steps sent) and still no response → suppress.
    if (doneSteps.size >= FOLLOWUP_DAYS.length) {
      await admin.database
        .from("patient")
        .update({ reactivation_status: "suppressed" })
        .eq("id", patient.id);
    }
  }

  return { processed };
}

export async function sendAppointmentReminders() {
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await admin.database
    .from("appointment")
    .select("id, patient_id, date, time, status, reminder_sent, patient(id, name, email)")
    .in("date", [today, tomorrow])
    .eq("status", "booked");

  if (error) throw error;

  let processed = 0;
  for (const appt of data || []) {
    const patient = (Array.isArray(appt.patient) ? appt.patient[0] : appt.patient) as unknown as PatientRow | null;
    if (!patient?.email) continue;

    const appointmentDateTime = new Date(`${appt.date}T${appt.time}`);
    const hoursBefore = (appointmentDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursBefore > 25) continue; // too early
    if (appt.reminder_sent) continue;

    const { subject, html } = bookingReminder(
      patient.name,
      fmtDate(appt.date),
      appt.time,
      hoursBefore
    );

    try {
      await sendEmail(patient.email, subject, html);
      await admin.database.from("emaillog").insert([
        { patient_id: patient.id, type: "reminder", subject, status: "sent" },
      ]);
      await admin.database
        .from("appointment")
        .update({ reminder_sent: true })
        .eq("id", appt.id);
      processed++;
    } catch (emailErr) {
      await admin.database.from("emaillog").insert([
        {
          patient_id: patient.id,
          type: "reminder",
          subject,
          status: "error",
          error: String(emailErr),
        },
      ]);
    }
  }

  return { processed };
}

export async function handleNoShows() {
  const today = new Date().toISOString().slice(0, 10);
  const nowTime = new Date().toTimeString().slice(0, 5);

  const { data, error } = await admin.database
    .from("appointment")
    .select("id, patient_id, date, time, status, patient(id, name, email)")
    .eq("date", today)
    .in("status", ["booked", "confirmed"]);

  if (error) throw error;

  let processed = 0;
  for (const appt of data || []) {
    if (appt.time >= nowTime) continue; // upcoming, not yet missed

    const patient = (Array.isArray(appt.patient) ? appt.patient[0] : appt.patient) as unknown as PatientRow | null;
    if (!patient?.email) continue;

    const { subject, html } = noShowReschedule(patient.name);
    try {
      await sendEmail(patient.email, subject, html);
      await admin.database.from("emaillog").insert([
        { patient_id: patient.id, type: "no_show", subject, status: "sent" },
      ]);
      await admin.database
        .from("appointment")
        .update({ status: "no_show" })
        .eq("id", appt.id);
      await admin.database
        .from("patient")
        .update({ reactivation_status: "responded" })
        .eq("id", patient.id);
      processed++;
    } catch (emailErr) {
      await admin.database.from("emaillog").insert([
        {
          patient_id: patient.id,
          type: "no_show",
          subject,
          status: "error",
          error: String(emailErr),
        },
      ]);
    }
  }

  return { processed };
}