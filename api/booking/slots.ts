import type { VercelRequest, VercelResponse } from "@vercel/node";
import { admin } from "../../src/lib/insforge.js";
import { config } from "../../src/lib/config.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Only show business days (Mon-Sat per config), starting tomorrow, 14 days out.
    const days: Date[] = [];
    let cursor = addDays(new Date(), 1);
    for (let i = 0; days.length < 14 && i < 30; i++) {
      const day = cursor.getDay(); // 0 = Sunday
      const dayNum = day === 0 ? 0 : day; // keep 1(M)-6(Sat) nonzero
      if (dayNum !== 0) {
        days.push(cursor);
      }
      cursor = addDays(cursor, 1);
    }

    // Build slot grid per day.
    const { data: appointments } = await admin.database
      .from("appointment")
      .select("date, time")
      .in("date", days.map(iso))
      .in("status", ["booked", "confirmed"]);

    const taken = new Set(
      (appointments || []).map((a) => `${a.date}|${a.time}`)
    );

    const slots = days.map((d) => {
      const dayNum = d.getDay();
      const isSat = dayNum === 6;
      const start = isSat ? config.businessHours.satStart : config.businessHours.start;
      const end = isSat ? config.businessHours.satEnd : config.businessHours.end;

      const times: string[] = [];
      for (let h = start; h < end; h++) {
        for (const [m, label] of [
          [0, ":00"],
          [30, ":30"],
        ] as const) {
          const t = `${String(h).padStart(2, "0")}${label}`;
          if (!taken.has(`${iso(d)}|${t}`)) {
            times.push(t);
          }
        }
      }

      return { date: iso(d), label: d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }), times };
    });

    return res.status(200).json({ slots });
  } catch (err) {
    console.error("booking slots error:", err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}