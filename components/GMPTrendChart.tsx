"use client";

import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GMPHistory } from "@/types/ipo";

interface GMPTrendChartProps {
  history: GMPHistory[];
}

export default function GMPTrendChart({ history }: GMPTrendChartProps) {
  const chartData = history
    .slice()
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    .map((row) => ({ date: row.captured_at, gmp: row.gmp_value }));

  if (chartData.length < 2) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Not enough GMP history yet.</p>;
  }

  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={chartData} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "var(--muted)" }} tickFormatter={(value) => format(new Date(value), "dd MMM")} tickLine={false} />
          <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "var(--muted)" }} tickFormatter={(value) => `₹${value}`} tickLine={false} width={52} />
          <Tooltip labelFormatter={(value) => format(new Date(String(value)), "dd MMM yyyy")} formatter={(value) => [`₹${Number(value ?? 0)}`, "GMP"]} />
          <Line dataKey="gmp" dot={{ r: 3 }} isAnimationActive={false} stroke="var(--amber)" strokeWidth={2} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
