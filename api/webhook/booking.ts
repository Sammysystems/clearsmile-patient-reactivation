import type { VercelRequest, VercelResponse } from "@vercel/node";
import { admin } from "../../src/lib/insforge.js";
import { sendEmail } from "../../src/lib/email.js";
import { bookingConfirmation } from "../../src/lib/templates.js";
import { fmtDate } from "../../src/lib/reactivation.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, date, time, service } = req.body;

    if (!name || !email || !date || !time) {
      return res.status(400).json({ error: "name, email, date and time are required" });
    }

    // Find existing patient by email, or create one.
    let patientId: string | null = null;
    const { data: existing } = await admin.database
      .from("patient")
      .select("id")
      .eq("email", email)
      .limit(1);

    if (existing && existing.length > 0) {
      patientId = existing[0].id;
    } else {
      const { data: created, error: insertError } = await admin.database
        .from("patient")
        .insert([{ name, email, status: "active", source: "booking" }])
        .select()
        .single();
      if (insertError) throw insertError;
      patientId = created.id;
    }

    const { data: appt, error: apptError } = await admin.database
      .from("appointment")
      .insert([
        {
          patient_id: patientId,
          date,
          time,
          service: service || "Check-up & Clean",
          status: "booked",
        },
      ])
      .select()
      .single();

    if (apptError) throw apptError;

    // Stop follow-ups: patient has responded by booking.
    await admin.database
      .from("patient")
      .update({ reactivation_status: "booked", last_visit_at: date })
      .eq("id", patientId);

    // Send confirmation.
    const { subject, html } = bookingConfirmation(name, fmtDate(date), time, service || "Check-up & Clean");
    try {
      await sendEmail(email, subject, html);
      await admin.database.from("emaillog").insert([
        { patient_id: patientId, type: "booking_confirmation", subject, status: "sent" },
      ]);
    } catch (emailErr) {
      await admin.database.from("emaillog").insert([
        {
          patient_id: patientId,
          type: "booking_confirmation",
          subject,
          status: "error",
          error: String(emailErr),
        },
      ]);
    }

    return res.status(200).json({ ok: true, appointmentId: appt.id, patientId });
  } catch (err) {
    console.error("booking webhook error:", err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}