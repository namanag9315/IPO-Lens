"use client";

import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";

interface GMPChartProps {
  history: { gmp_value: number; captured_at: string }[];
}

interface TooltipContentProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ value?: number }>;
}

function TooltipContent({ active, label, payload }: TooltipContentProps) {
  if (!active || !payload?.length || !label) {
    return null;
  }

  return (
    <div
      className="mono"
      style={{
        background: "var(--navy-800)",
        border: "1px solid var(--border-default)",
        borderRadius: 6,
        color: "var(--text-primary)",
        fontSize: 12,
        padding: "8px 12px",
      }}
    >
      <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>{format(new Date(label), "dd MMM")}</div>
      <div>₹{payload[0]?.value ?? 0}</div>
    </div>
  );
}

export default function GMPChart({ history }: GMPChartProps) {
  const [mounted, setMounted] = useState(false);
  const data = history
    .slice()
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    .map((item) => ({
      captured_at: item.captured_at,
      gmp_value: item.gmp_value,
    }));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (data.length < 2) {
    return (
      <p style={{ color: "var(--text-muted)", fontSize: 12, padding: "24px 0" }}>
        Not enough GMP history yet
      </p>
    );
  }

  if (!mounted) {
    return <div style={{ height: 180, width: "100%" }} />;
  }

  return (
    <div style={{ height: 180, width: "100%" }}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={data} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
          <CartesianGrid horizontal opacity={0.6} stroke="var(--border-subtle)" strokeDasharray="0" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="captured_at"
            tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "var(--text-muted)" }}
            tickFormatter={(value: string) => format(new Date(value), "dd MMM")}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fontFamily: "JetBrains Mono", fontSize: 10, fill: "var(--text-muted)" }}
            tickFormatter={(value: number) => `₹${value}`}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<TooltipContent />} cursor={{ stroke: "var(--border-default)" }} />
          <Line
            activeDot={{ r: 5, fill: "var(--amber-400)", strokeWidth: 0 }}
            dataKey="gmp_value"
            dot={{ fill: "var(--amber-500)", r: 3, strokeWidth: 0 }}
            isAnimationActive={false}
            stroke="var(--amber-500)"
            strokeWidth={1.5}
            type="monotone"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
