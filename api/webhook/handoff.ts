import type { VercelRequest, VercelResponse } from "@vercel/node";
import { admin } from "../../src/lib/insforge.js";
import { sendEmail } from "../../src/lib/email.js";
import { handoffConfirmation } from "../../src/lib/templates.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, service, message } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

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

    // Add to staff handoff queue.
    const { data: handoff, error: handoffError } = await admin.database
      .from("staffhandoff")
      .insert([
        {
          patient_id: patientId,
          source: "booking",
          service: service || null,
          message: message || null,
          handled: false,
        },
      ])
      .select()
      .single();

    if (handoffError) throw handoffError;

    await admin.database
      .from("patient")
      .update({ reactivation_status: "responded" })
      .eq("id", patientId);

    // Confirm to the patient that a human will follow up.
    const { subject, html } = handoffConfirmation(name);
    try {
      await sendEmail(email, subject, html);
      await admin.database.from("emaillog").insert([
        { patient_id: patientId, type: "handoff_confirmation", subject, status: "sent" },
      ]);
    } catch (emailErr) {
      await admin.database.from("emaillog").insert([
        {
          patient_id: patientId,
          type: "handoff_confirmation",
          subject,
          status: "error",
          error: String(emailErr),
        },
      ]);
    }

    return res.status(200).json({ ok: true, handoffId: handoff.id, patientId });
  } catch (err) {
    console.error("handoff webhook error:", err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}