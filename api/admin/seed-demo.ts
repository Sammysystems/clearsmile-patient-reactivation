import type { VercelRequest, VercelResponse } from "@vercel/node";
import { admin } from "../../src/lib/insforge.js";

const FIRST = ["Amara", "David", "Emily", "Kwame", "Liam", "Sophia", "Noah", "Grace", "Ethan", "Ava", "Tariq", "Zoe", "Marcus", "Nia", "Julian", "Imani", "Oscar", "Priya", "Felix", "Ruth", "Caleb", "Maya", "Ian", "Nadia", "Tobias", "Leila", "Victor", "Anya", "Simon", "Hana", "Diego", "Rebecca", "Troy", "Layla", "Omar", "Chloe", "Nathan", "Alice", "Eli", "Dana"];
const LAST = ["Okafor", "Walker", "Chen", "Mensah", "Turner", "Nguyen", "Barrow", "da Silva", "Moyo", "Reed", "Silva", "Park", "Hale", "Osei", "Bennett", "Adjei", "Moore", "Sharma", "Kou", "Carter", "Brooks", "Diallo", "Kane", "Foster", "Richards", "Garcia", "Cole", "Peters", "Grant", "Yusuf", "Martin", "Long", "Njoku", "Reyes", "Abbas", "Quinn", "Ford", "Kim", "Ross", "Bello"];

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function randomPhone(): string {
  return `04${Math.floor(10000000 + Math.random() * 89999999)}`;
}

interface SeedPatient {
  name: string;
  email: string;
  phone: string;
  last_visit_at: string | null;
  status: string;
  reactivation_status: string;
  flagged_at: string | null;
  source: string;
}

function randomEmail(i: number): string {
  return `${FIRST[i].toLowerCase()}.${LAST[i].toLowerCase()}${i + 12}@example.com`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (process.env.SEED_ENABLED !== "true") {
    return res.status(403).json({ error: "Seeding is disabled. Set SEED_ENABLED=true to enable." });
  }

  try {
    // Clear any prior seed for a clean demo.
    await admin.database.from("emaillog").delete().neq("id", "");
    await admin.database.from("staffhandoff").delete().neq("id", "");
    await admin.database.from("appointment").delete().neq("id", "");
    await admin.database.from("followup").delete().neq("id", "");
    await admin.database.from("patient").delete().neq("id", "");

    // 40 patients with a realistic campaign distribution.
    const specs: { age: number; status: string }[] = [];
    // ~18 overdue: not yet fully worked
    for (let i = 0; i < 18; i++) specs.push({ age: 200 + i * 7, status: "overdue" });
    // ~9 contacted (first follow-up sent)
    for (let i = 0; i < 9; i++) specs.push({ age: 160 + i * 5, status: "contacted" });
    // ~4 responded (replied, recently in touch)
    for (let i = 0; i < 4; i++) specs.push({ age: 90 + i * 4, status: "responded" });
    // ~6 booked (booked their own visit)
    for (let i = 0; i < 6; i++) specs.push({ age: 40 + i * 3, status: "booked" });
    // ~3 suppressed (recently contacted / quiet list)
    for (let i = 0; i < 3; i++) specs.push({ age: 30 + i * 2, status: "suppressed" });

    const patients: SeedPatient[] = specs.map((s, i) => ({
      name: `${FIRST[i]} ${LAST[i]}`,
      email: randomEmail(i),
      phone: randomPhone(),
      last_visit_at: isoDaysAgo(s.age),
      status: "active",
      reactivation_status: s.status,
      flagged_at:
        s.status === "none" || s.status === "suppressed"
          ? s.status === "suppressed"
            ? hoursAgo(2 * 24)
            : null
          : hoursAgo(s.status === "booked" ? 6 : s.status === "contacted" ? 240 : 96),
      source: "import",
    }));

    const { data, error } = await admin.database.from("patient").insert(patients).select();
    if (error) throw error;
    const ids: Record<string, string | undefined> = {};
    (data || []).forEach((p, i) => { ids[specs[i].status] = ids[specs[i].status] || p.id; });

    // Seed a handful of realistic reactivation emails already "sent".
    const emailRows = specs
      .map((s, i) => {
        if (s.status !== "contacted" && s.status !== "responded") return null;
        const step = s.status === "responded" ? 2 : 1;
        const subject =
          step === 1
            ? "It's been a while - your smile misses you"
            : "We saved the last appointment for you";
        return {
          patient_id: (data || [])[i].id,
          type: `reactivation_${step}`,
          subject,
          status: "sent",
          created_at: hoursAgo(90 + i * 5),
        };
      })
      .filter(Boolean) as { patient_id: string; type: string; subject: string; status: string; created_at: string }[];

    if (emailRows.length > 0) {
      await admin.database.from("emaillog").insert(emailRows);
    }

    // A couple of upcoming appointments for the booked patients.
    const bookedIds = (data || []).filter((_, i) => specs[i].status === "booked").slice(0, 3);
    if (bookedIds.length > 0) {
      await admin.database.from("appointment").insert(
        bookedIds.map((p, i) => ({
          patient_id: p.id,
          date: isoDaysAgo(-(i + 2)),
          time: `${9 + i}:30`,
          service: i % 2 === 0 ? "Check-up & Clean" : "Cleaning & Polish",
          status: "booked",
        }))
      );
    }

    // One open staff handoff.
    const handoffPatient = (data || []).find((_, i) => specs[i].status === "responded");
    if (handoffPatient) {
      await admin.database.from("staffhandoff").insert([
        {
          patient_id: handoffPatient.id,
          source: "booking",
          service: "Check-up & Clean",
          message: "Can I pay in instalments for a full set of x-rays?",
          handled: false,
        },
      ]);
    }

    return res.status(200).json({ ok: true, seeded: data?.length || patients.length });
  } catch (err) {
    console.error("seed-demo error:", err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}