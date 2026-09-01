import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  flagOverduePatients,
  processFollowups,
  sendAppointmentReminders,
  handleNoShows,
} from "../../src/lib/reactivation.js";

const JOBS = {
  "scan-overdue": { fn: flagOverduePatients, label: "Overdue scan complete" },
  "process-followups": { fn: processFollowups, label: "Follow-up processing complete" },
  "send-reminders": { fn: sendAppointmentReminders, label: "Reminder processing complete" },
  "handle-no-shows": { fn: handleNoShows, label: "No-show processing complete" },
} as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (process.env.CRON_SECRET && req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const type = (req.query.type as string) || "scan-overdue";
  const job = JOBS[type as keyof typeof JOBS];

  if (!job) {
    return res.status(400).json({ error: `Unknown job: ${type}. Valid: ${Object.keys(JOBS).join(", ")}` });
  }

  try {
    const result = await job.fn();
    return res.status(200).json({ ...result, message: job.label });
  } catch (err) {
    console.error(`${type} error:`, err);
    return res.status(500).json({ error: "Internal server error", detail: String(err) });
  }
}
