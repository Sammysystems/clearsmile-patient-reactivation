export const statusMeta: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  overdue: {
    label: "Overdue",
    color: "#F5A623",
    bg: "rgba(245,166,35,0.12)",
    border: "rgba(245,166,35,0.35)",
  },
  contacted: {
    label: "Contacted",
    color: "#A78BFA",
    bg: "rgba(167,139,250,0.12)",
    border: "rgba(167,139,250,0.35)",
  },
  responded: {
    label: "Responded",
    color: "#38BDF8",
    bg: "rgba(56,189,248,0.12)",
    border: "rgba(56,189,248,0.35)",
  },
  booked: {
    label: "Booked",
    color: "#4ADE80",
    bg: "rgba(74,222,128,0.12)",
    border: "rgba(74,222,128,0.35)",
  },
  suppressed: {
    label: "Suppressed",
    color: "#8A8A8A",
    bg: "rgba(138,138,138,0.10)",
    border: "rgba(138,138,138,0.25)",
  },
  opted_out: {
    label: "Opted Out",
    color: "#8A8A8A",
    bg: "rgba(138,138,138,0.10)",
    border: "rgba(138,138,138,0.25)",
  },
  none: {
    label: "Active",
    color: "#F4F4F4",
    bg: "rgba(244,244,244,0.06)",
    border: "rgba(244,244,244,0.12)",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] || statusMeta.none;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider"
      style={{
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: meta.color }}
      />
      {meta.label}
    </span>
  );
}