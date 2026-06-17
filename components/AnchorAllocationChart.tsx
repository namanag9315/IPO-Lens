"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getAnchorAllocationPct } from "@/lib/anchorInvestorScoring";
import type { IPOAnchorInvestor } from "@/types/ipo";

interface AnchorAllocationChartProps {
  investors: IPOAnchorInvestor[];
}

export default function AnchorAllocationChart({ investors }: AnchorAllocationChartProps) {
  const chartData = investors
    .slice()
    .sort((a, b) => getAnchorAllocationPct(b) - getAnchorAllocationPct(a))
    .slice(0, 8)
    .map((investor) => ({
      name: investor.investor_name,
      allocation: getAnchorAllocationPct(investor),
    }));

  if (chartData.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Anchor allocation data not available.</p>;
  }

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={chartData} layout="vertical" margin={{ bottom: 0, left: 20, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--line)" horizontal={false} />
          <XAxis
            axisLine={false}
            tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "var(--muted)" }}
            tickFormatter={(value) => `${value}%`}
            tickLine={false}
            type="number"
          />
          <YAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} tickLine={false} type="category" width={120} />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--line-strong)",
              borderRadius: 12,
              boxShadow: "var(--shadow)",
              color: "var(--ink)",
              fontFamily: "JetBrains Mono",
              fontSize: 12,
            }}
            formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, "Anchor book"]}
          />
          <Bar dataKey="allocation" fill="var(--blue)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
