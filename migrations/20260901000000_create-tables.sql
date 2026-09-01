-- Patient Reactivation System
-- Dental clinic: identifies overdue patients, emails them, lets them self-book,
-- routes questions to staff, and tracks every status on one dashboard.

-- Patients
CREATE TABLE IF NOT EXISTS patient (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  last_visit_at DATE,
  next_due_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  reactivation_status TEXT NOT NULL DEFAULT 'none', -- none | overdue | contacted | responded | booked | suppressed | opted_out
  flagged_at TIMESTAMPTZ,
  opted_out BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'import',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Follow-ups sent per patient (reactivation sequence tracking)
CREATE TABLE IF NOT EXISTS followup (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id TEXT NOT NULL REFERENCES patient(id),
  step INTEGER NOT NULL,
  type TEXT NOT NULL DEFAULT 'reactivation', -- reactivation | reminder | no_show | handoff
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointment (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id TEXT NOT NULL REFERENCES patient(id),
  date DATE NOT NULL,
  time TEXT NOT NULL,
  service TEXT NOT NULL DEFAULT 'Check-up & Clean',
  status TEXT NOT NULL DEFAULT 'booked', -- booked | confirmed | attended | no_show | rescheduled | cancelled
  reminder_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email send log
CREATE TABLE IF NOT EXISTS emaillog (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id TEXT,
  type TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sent', -- sent | error
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff handoff queue (patient questions / requests that need a human)
CREATE TABLE IF NOT EXISTS staffhandoff (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  patient_id TEXT NOT NULL REFERENCES patient(id),
  source TEXT NOT NULL DEFAULT 'booking', -- booking | reply | manual
  service TEXT,
  message TEXT,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_reactivation_status ON patient(reactivation_status);
CREATE INDEX IF NOT EXISTS idx_patient_status ON patient(status);
CREATE INDEX IF NOT EXISTS idx_patient_email ON patient(email);
CREATE INDEX IF NOT EXISTS idx_patient_last_visit ON patient(last_visit_at);
CREATE INDEX IF NOT EXISTS idx_followup_patient ON followup(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointment_patient ON appointment(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointment_date ON appointment(date);
CREATE INDEX IF NOT EXISTS idx_appointment_status ON appointment(status);
CREATE INDEX IF NOT EXISTS idx_emaillog_patient ON emaillog(patient_id);
CREATE INDEX IF NOT EXISTS idx_handoff_handled ON staffhandoff(handled);