function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const config = {
  clinicName: process.env.CLINIC_NAME || "ClearSmile Dental",
  clinicAddress: process.env.CLINIC_ADDRESS || "102 King St, Newtown",
  clinicCity: process.env.CLINIC_CITY || "Sydney, NSW 2042",
  clinicPhone: process.env.CLINIC_PHONE || "(02) 9123 4567",

  bookingUrlBase:
    process.env.BOOKING_URL_BASE || "http://localhost:3000/book",

  overdueMonths: int("OVERDUE_MONTHS", 6),
  suppressionDays: int("SUPPRESSION_DAYS", 90),

  businessHours: {
    start: int("BUSINESS_HOURS_START", 8),
    end: int("BUSINESS_HOURS_END", 18),
    satStart: int("SATURDAY_HOURS_START", 9),
    satEnd: int("SATURDAY_HOURS_END", 16),
  },

  seedEnabled: process.env.SEED_ENABLED === "true",
};

export const FOLLOWUP_DAYS = [0, 7, 14];

export type ReactivationStatus =
  | "none"
  | "overdue"
  | "contacted"
  | "responded"
  | "booked"
  | "suppressed"
  | "opted_out";

export type AppointmentStatus =
  | "booked"
  | "confirmed"
  | "attended"
  | "no_show"
  | "rescheduled"
  | "cancelled";

export function overdueCutoff(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - config.overdueMonths);
  return d;
}

export function suppressionCutoff(): Date {
  const d = new Date();
  d.setDate(d.getDate() - config.suppressionDays);
  return d;
}

export function isOverdue(lastVisitAt: string | null | undefined): boolean {
  if (!lastVisitAt) return true; // no visit on record = always due
  const last = new Date(lastVisitAt);
  return last < overdueCutoff();
}