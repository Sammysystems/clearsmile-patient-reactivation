import type { VercelRequest, VercelResponse } from "@vercel/node";
import { admin } from "../../src/lib/insforge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await admin.database
        .from("staffhandoff")
        .select("id, patient_id, source, service, message, handled, created_at, patient(name, email, phone)")
        .eq("handled", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return res.status(200).json({ handoffs: data });
    }

    if (req.method === "PATCH") {
      const { id, handled = true } = req.body;
      if (!id) return res.status(400).json({ error: "id is required" });

      const { data, error } = await admin.database
        .from("staffhandoff")
        .update({ handled: Boolean(handled) })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ ok: true, handoff: data });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("admin handoffs error:", err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}