"use client";

import { format } from "date-fns";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SubscriptionData } from "@/types/ipo";

interface SubscriptionTrendChartProps {
  history: SubscriptionData[];
}

export default function SubscriptionTrendChart({ history }: SubscriptionTrendChartProps) {
  const chartData = history
    .slice()
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    .map((row) => ({
      date: row.captured_at,
      qib: row.qib_x,
      nii: row.nii_x,
      retail: row.retail_x,
      total: row.total_x,
    }));

  if (chartData.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Subscription history not available.</p>;
  }

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={chartData} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="date" tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "var(--muted)" }} tickFormatter={(value) => format(new Date(value), "dd MMM")} tickLine={false} />
          <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "var(--muted)" }} tickFormatter={(value) => `${value}x`} tickLine={false} width={48} />
          <Tooltip labelFormatter={(value) => format(new Date(String(value)), "dd MMM yyyy")} formatter={(value, name) => [`${Number(value ?? 0)}x`, String(name).toUpperCase()]} />
          <Line dataKey="qib" dot={{ r: 3 }} isAnimationActive={false} stroke="var(--blue)" strokeWidth={2} type="monotone" />
          <Line dataKey="nii" dot={{ r: 3 }} isAnimationActive={false} stroke="var(--amber)" strokeWidth={2} type="monotone" />
          <Line dataKey="retail" dot={{ r: 3 }} isAnimationActive={false} stroke="var(--green)" strokeWidth={2} type="monotone" />
          <Line dataKey="total" dot={{ r: 3 }} isAnimationActive={false} stroke="var(--ink)" strokeWidth={2} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
