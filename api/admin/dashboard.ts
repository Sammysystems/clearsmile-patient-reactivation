import type { VercelRequest, VercelResponse } from "@vercel/node";
import { admin } from "../../src/lib/insforge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data: patients } = await admin.database
      .from("patient")
      .select("reactivation_status");

    const { count: appointmentCount } = await admin.database
      .from("appointment")
      .select("*", { count: "exact", head: true });

    const { count: handoffCount } = await admin.database
      .from("staffhandoff")
      .select("*", { count: "exact", head: true })
      .eq("handled", false);

    const { count: emailCount } = await admin.database
      .from("emaillog")
      .select("*", { count: "exact", head: true });

    const counts: Record<string, number> = {};
    (patients || []).forEach((p) => {
      const key = p.reactivation_status || "none";
      counts[key] = (counts[key] || 0) + 1;
    });

    return res.status(200).json({
      counts,
      totalPatients: patients?.length || 0,
      appointments: appointmentCount || 0,
      openHandoffs: handoffCount || 0,
      emailsSent: emailCount || 0,
    });
  } catch (err) {
    console.error("admin dashboard error:", err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}