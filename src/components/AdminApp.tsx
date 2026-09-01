import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Mail,
  Calendar,
  Inbox,
  Database,
  Clock,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { StatusBadge } from "./ui.tsx";

interface DashboardData {
  counts: Record<string, number>;
  totalPatients: number;
  appointments: number;
  openHandoffs: number;
  emailsSent: number;
}

interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  last_visit_at: string | null;
  reactivation_status: string;
  flagged_at: string | null;
  created_at: string;
}

interface Handoff {
  id: string;
  source: string;
  service: string | null;
  message: string | null;
  created_at: string;
  patient: { name: string; email: string; phone: string } | null;
}

interface EmailLogRow {
  id: string;
  type: string;
  subject: string | null;
  status: string;
  created_at: string;
}

type Tab = "overview" | "patients" | "handoffs" | "emails";

export default function AdminApp() {
  const [tab, setTab] = useState<Tab>("overview");
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [logs, setLogs] = useState<EmailLogRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reloading, setReloading] = useState(false);

  const load = useCallback(async (t: Tab = tab) => {
    setReloading(true);
    try {
      if (t === "overview" || t === "emails" || t === "patients" || t === "handoffs") {
        const [dashRes, logRes] = await Promise.all([
          fetch("/api/admin/dashboard"),
          fetch("/api/admin/emaillogs"),
        ]);
        setDash(await dashRes.json());
        const logData = await logRes.json();
        setLogs(Array.isArray(logData) ? logData : logData.logs || []);
      }
      if (t === "overview" || t === "patients") {
        const res = await fetch(
          `/api/admin/patients?status=${t === "overview" ? "all" : statusFilter}&limit=100`
        );
        const data = await res.json();
        setPatients(data.patients || []);
      }
      if (t === "handoffs") {
        const res = await fetch("/api/admin/handoffs");
        const data = await res.json();
        setHandoffs(data.handoffs || []);
      }
    } catch {
      /* keep last state */
    } finally {
      setReloading(false);
    }
  }, [tab, statusFilter]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "patients") load("patients");
    if (tab === "handoffs") load("handoffs");
    if (tab === "emails") load("emails");
    if (tab === "overview") load("overview");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter]);

  const markHandled = async (id: string) => {
    await fetch("/api/admin/handoffs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, handled: true }),
    });
    load("handoffs");
  };

  return (
    <div className="min-h-screen" style={{ background: "#0c0c0c" }}>
      <header className="border-b border-[#2a2a2a] sticky top-0 z-40" style={{ background: "#0c0c0c" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-extrabold tracking-tight" style={{ color: "#f4f4f4" }}>
                ClearSmile Reactivation
              </h1>
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                style={{ background: "rgba(245,166,35,0.12)", border: "1px solid rgba(245,166,35,0.35)", color: "#f5a623" }}
              >
                Staff Only
              </span>
            </div>
            <p className="text-[12px] mt-0.5" style={{ color: "#555555" }}>
              Patient Reactivation Dashboard
            </p>
          </div>
          <button
            onClick={() => load()}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-all"
            style={{ borderColor: "#2a2a2a", color: "#f4f4f4" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${reloading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <nav className="max-w-7xl mx-auto px-6 md:px-16 pt-6 flex gap-2 flex-wrap">
        {(
          [
            ["overview", "Overview"],
            ["patients", "Patients"],
            ["handoffs", "Handoffs"],
            ["emails", "Email Log"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
            style={
              tab === id
                ? { background: "#f5a623", color: "#0c0c0c" }
                : { border: "1px solid #2a2a2a", color: "#8a8a8a" }
            }
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="max-w-7xl mx-auto px-6 md:px-16 py-8">
        {tab === "overview" && <Overview dash={dash} patients={patients} logs={logs} />}
        {tab === "patients" && (
          <Patients patients={patients} statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
        )}
        {tab === "handoffs" && <Handoffs handoffs={handoffs} markHandled={markHandled} />}
        {tab === "emails" && <Emails logs={logs} />}
      </main>
    </div>
  );
}

/* ---------- Overview ---------- */

function Overview({ dash, patients, logs }: { dash: DashboardData | null; patients: Patient[]; logs: EmailLogRow[] }) {
  if (!dash) return <LoadingState />;

  const cards = [
    { label: "Total Patients", value: dash.totalPatients, icon: <Users className="w-4 h-4" />, color: "#F4F4F4" },
    { label: "Overdue", value: dash.counts.overdue || 0, icon: <Clock className="w-4 h-4" />, color: "#F5A623" },
    { label: "Contacted", value: dash.counts.contacted || 0, icon: <Mail className="w-4 h-4" />, color: "#A78BFA" },
    { label: "Booked", value: dash.counts.booked || 0, icon: <Calendar className="w-4 h-4" />, color: "#4ADE80" },
    { label: "Upcoming Appointments", value: dash.appointments, icon: <Calendar className="w-4 h-4" />, color: "#38BDF8" },
    { label: "Open Handoffs", value: dash.openHandoffs, icon: <Inbox className="w-4 h-4" />, color: "#F87171" },
  ];

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-6" style={{ color: "#f4f4f4" }}>
        Patient Reactivation Overview
      </h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl p-5"
            style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}
          >
            <div className="flex items-center gap-2 mb-3" style={{ color: c.color }}>
              {c.icon}
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8a8a8a" }}>
                {c.label}
              </span>
            </div>
            <span className="text-3xl font-extrabold" style={{ color: c.color }}>
              {c.value}
            </span>
          </div>
        ))}
      </div>

      {/* Reactivation funnel */}
      <ReactivationFunnel dash={dash} />

      {/* Priority + recent activity */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <PriorityList patients={patients} />
        <RecentActivity logs={logs} />
      </div>
    </div>
  );
}

function ReactivationFunnel({ dash }: { dash: DashboardData }) {
  const total = dash.totalPatients;
  const overdue = dash.counts.overdue || 0;
  const contacted = dash.counts.contacted || 0;
  const responded = dash.counts.responded || 0;
  const booked = dash.counts.booked || 0;

  const stages = [
    { label: "Total patients", value: total, color: "#F4F4F4" },
    { label: "Overdue", value: overdue, color: "#F5A623" },
    { label: "Contacted", value: contacted, color: "#A78BFA" },
    { label: "Responded", value: responded, color: "#38BDF8" },
    { label: "Booked", value: booked, color: "#4ADE80" },
  ];

  const pct = (a: number, b: number) => (a === 0 ? 0 : Math.round((b / a) * 100));

  return (
    <div className="rounded-2xl p-6 md:p-8" style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#f4f4f4" }}>
          Reactivation funnel
        </h3>
        <span className="text-[11px] font-semibold" style={{ color: "#555555" }}>
          This reactivation cycle
        </span>
      </div>

      {/* Stacked conversion bars */}
      <div className="flex h-10 w-full overflow-hidden rounded-lg" style={{ gap: "2px" }}>
        {stages.map((s, i) => {
          const width = s.value > 0 ? `${Math.max((s.value / total) * 100, 2)}%` : "0%";
          return (
            <div
              key={s.label}
              className="h-full transition-all"
              style={{ width, background: s.color, opacity: 1 - i * 0.15 }}
              title={`${s.label}: ${s.value}`}
            />
          );
        })}
      </div>

      {/* Stage legend with conversion drop-off */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
        {stages.map((s, i) => {
          const prior = stages[i - 1];
          const conv = prior ? pct(prior.value, s.value) : null;
          return (
            <div key={s.label}>
              <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#8a8a8a" }}>
                {s.label}
              </div>
              <div className="text-2xl font-extrabold" style={{ color: s.color }}>
                {s.value}
              </div>
              {conv !== null && (
                <div className="text-[11px] mt-0.5" style={{ color: "#555555" }}>
                  {conv}% of {prior.label.toLowerCase()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriorityList({ patients }: { patients: Patient[] }) {
  const overdue = patients
    .filter((p) => ["overdue", "contacted"].includes(p.reactivation_status || ""))
    .slice(0, 6);

  return (
    <div className="rounded-2xl p-6" style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}>
      <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#f4f4f4" }}>
        Awaiting follow-up
      </h3>
      {overdue.length === 0 && (
        <p className="text-sm" style={{ color: "#8a8a8a" }}>
          Nothing in the follow-up queue right now.
        </p>
      )}
      <ul className="space-y-3">
        {overdue.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: "#f4f4f4" }}>
                {p.name}
              </div>
              <div className="text-[11px] truncate" style={{ color: "#555555" }}>
                {p.email || "No email on file"}
              </div>
            </div>
            <StatusBadge status={p.reactivation_status || "none"} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecentActivity({ logs }: { logs: EmailLogRow[] }) {
  const recent = logs.slice(0, 6);

  return (
    <div className="rounded-2xl p-6" style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}>
      <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "#f4f4f4" }}>
        Recent emails
      </h3>
      {recent.length === 0 && (
        <p className="text-sm" style={{ color: "#8a8a8a" }}>
          No emails sent yet in this cycle.
        </p>
      )}
      <ul className="space-y-3">
        {recent.map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] font-medium truncate" style={{ color: "#f4f4f4" }}>
                {l.subject || l.type}
              </div>
              <div className="text-[11px]" style={{ color: "#555555" }}>
                {prettyDateTime(l.created_at)}
              </div>
            </div>
            <span
              className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={
                l.status === "sent"
                  ? { background: "rgba(74,222,128,0.12)", color: "#4ade80" }
                  : { background: "rgba(224,85,85,0.12)", color: "#e05555" }
              }
            >
              {l.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Patients ---------- */

function Patients({
  patients,
  statusFilter,
  setStatusFilter,
}: {
  patients: Patient[];
  statusFilter: string;
  setStatusFilter: (s: string) => void;
}) {
  const filters = ["all", "overdue", "contacted", "responded", "booked", "suppressed"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-extrabold" style={{ color: "#f4f4f4" }}>
          Patients
        </h2>
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all"
              style={
                statusFilter === f
                  ? { background: "#f5a623", color: "#0c0c0c" }
                  : { border: "1px solid #2a2a2a", color: "#8a8a8a" }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider" style={{ color: "#555555", borderBottom: "1px solid #2a2a2a" }}>
              <th className="px-5 py-3 font-bold">Patient</th>
              <th className="px-5 py-3 font-bold hidden md:table-cell">Last Visit</th>
              <th className="px-5 py-3 font-bold">Status</th>
              <th className="px-5 py-3 font-bold hidden md:table-cell">Contact</th>
            </tr>
          </thead>
          <tbody>
            {patients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm" style={{ color: "#8a8a8a" }}>
                  No patients in this view yet.
                </td>
              </tr>
            )}
            {patients.map((p) => (
              <tr key={p.id} className="border-b border-[#2a2a2a] last:border-b-0 hover:bg-white/[0.03]">
                <td className="px-5 py-4">
                  <span className="font-semibold text-sm" style={{ color: "#f4f4f4" }}>
                    {p.name}
                  </span>
                </td>
                <td className="px-5 py-4 hidden md:table-cell text-sm" style={{ color: "#8a8a8a" }}>
                  {p.last_visit_at ? prettyDate(p.last_visit_at) : "—"}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={p.reactivation_status || "none"} />
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className="text-[12px]" style={{ color: "#555555" }}>
                    {p.email || "—"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Handoffs ---------- */

function Handoffs({
  handoffs,
  markHandled,
}: {
  handoffs: Handoff[];
  markHandled: (id: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-6" style={{ color: "#f4f4f4" }}>
        Front Desk Queue
      </h2>
      {handoffs.length === 0 && (
        <div
          className="rounded-xl p-8 text-center"
          style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}
        >
          <p className="text-sm" style={{ color: "#8a8a8a" }}>
            No open handoffs. Patient questions route here automatically.
          </p>
        </div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {handoffs.map((h) => (
          <div key={h.id} className="rounded-xl p-5" style={{ background: "#1c1c1c", border: "1px solid #f5a623/40" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm" style={{ color: "#f4f4f4" }}>
                {h.patient?.name || "Patient"}
              </span>
              <span className="text-[11px]" style={{ color: "#555555" }}>
                {prettyDateTime(h.created_at)}
              </span>
            </div>
            {h.service && (
              <span
                className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-3"
                style={{ background: "rgba(245,166,35,0.12)", color: "#f5a623" }}
              >
                {h.service}
              </span>
            )}
            {h.message && (
              <p className="text-sm mb-3 leading-relaxed" style={{ color: "#c9c9c9" }}>
                "{h.message}"
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: "#555555" }}>
                {h.patient?.phone || h.patient?.email || ""}
              </span>
              <button
                onClick={() => markHandled(h.id)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all"
                style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ade80" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Handled
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Emails ---------- */

function Emails({ logs }: { logs: EmailLogRow[] }) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-6" style={{ color: "#f4f4f4" }}>
        Email Log
      </h2>
      <div className="rounded-xl overflow-hidden" style={{ background: "#1c1c1c", border: "1px solid #2a2a2a" }}>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider" style={{ color: "#555555", borderBottom: "1px solid #2a2a2a" }}>
              <th className="px-5 py-3 font-bold">Type</th>
              <th className="px-5 py-3 font-bold">Subject</th>
              <th className="px-5 py-3 font-bold">Status</th>
              <th className="px-5 py-3 font-bold hidden md:table-cell">Sent</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm" style={{ color: "#8a8a8a" }}>
                  No emails sent yet.
                </td>
              </tr>
            )}
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-[#2a2a2a] last:border-b-0 hover:bg-white/[0.03]">
                <td className="px-5 py-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded" style={{ background: "rgba(245,166,35,0.10)", color: "#f5a623" }}>
                    {l.type}
                  </span>
                </td>
                <td className="px-5 py-3 text-sm" style={{ color: "#f4f4f4" }}>
                  {l.subject || "—"}
                </td>
                <td className="px-5 py-3">
                  <span
                    className="text-[11px] font-bold uppercase"
                    style={{ color: l.status === "sent" ? "#4ade80" : "#e05555" }}
                  >
                    {l.status}
                  </span>
                </td>
                <td className="px-5 py-3 hidden md:table-cell text-[12px]" style={{ color: "#555555" }}>
                  {prettyDateTime(l.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function LoadingState() {
  return (
    <div className="py-20 text-center">
      <div className="inline-block w-8 h-8 rounded-full border-2 border-[#2a2a2a] border-t-[#f5a623] animate-spin mb-4" />
      <p className="text-sm" style={{ color: "#8a8a8a" }}>
        Loading dashboard…
      </p>
    </div>
  );
}

function prettyDate(iso: string): string {
  const d = new Date(iso);
  try {
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

function prettyDateTime(iso: string): string {
  const d = new Date(iso);
  try {
    return d.toLocaleString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}