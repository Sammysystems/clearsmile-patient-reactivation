import type { VercelRequest, VercelResponse } from "@vercel/node";
import { admin } from "../../src/lib/insforge.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data, error } = await admin.database
      .from("emaillog")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return res.status(200).json({ logs: data });
  } catch (err) {
    console.error("admin emaillogs error:", err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}