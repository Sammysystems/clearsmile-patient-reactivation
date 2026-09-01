import type { VercelRequest, VercelResponse } from "@vercel/node";
import { admin } from "../../src/lib/insforge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const patients = req.body.patients;
    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ error: "patients array is required" });
    }

    const rows = patients.map((p: Record<string, unknown>) => ({
      name: p.name,
      email: p.email || null,
      phone: p.phone || null,
      last_visit_at: p.last_visit_at || null,
      status: "active",
      source: p.source || "import",
    }));

    const { data, error } = await admin.database.from("patient").insert(rows).select();
    if (error) throw error;

    return res.status(200).json({ ok: true, imported: data?.length || rows.length });
  } catch (err) {
    console.error("patient import error:", err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}