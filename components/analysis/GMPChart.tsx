"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface GMPPoint {
  captured_at: string;
  gmp_value: number | null;
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(new Date(value));
}

function TooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="analysis-chart-tooltip">
      <span>{label}</span>
      <strong className="mono">₹{payload[0].value}</strong>
    </div>
  );
}

export default function GMPChart({ history }: { history: GMPPoint[] }) {
  const data = history
    .filter((row) => row.gmp_value !== null)
    .slice()
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    .slice(-7)
    .map((row) => ({
      date: shortDate(row.captured_at),
      gmp: row.gmp_value ?? 0,
    }));

  if (data.length < 2) {
    return <div className="analysis-empty-state">At least two GMP snapshots are needed to show a trend.</div>;
  }

  return (
    <div className="analysis-mini-chart">
      <ResponsiveContainer height={140} width="100%">
        <LineChart data={data} margin={{ bottom: 0, left: -14, right: 8, top: 12 }}>
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey="date" tick={{ fill: "#64748B", fontFamily: "JetBrains Mono, monospace", fontSize: 10 }} tickLine={false} />
          <YAxis axisLine={false} tick={{ fill: "#64748B", fontFamily: "JetBrains Mono, monospace", fontSize: 10 }} tickFormatter={(value) => `₹${value}`} tickLine={false} width={48} />
          <Tooltip content={<TooltipContent />} />
          <Line dataKey="gmp" dot={{ fill: "#D97706", r: 3 }} name="GMP" stroke="#D97706" strokeWidth={2.5} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
