"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IPOFinancialYearly } from "@/types/ipo";

interface MarginTrendChartProps {
  data: IPOFinancialYearly[];
}

export default function MarginTrendChart({ data }: MarginTrendChartProps) {
  const chartData = data.map((row) => ({
    year: row.financial_year,
    ebitda: row.ebitda_margin_pct ?? 0,
    pat: row.pat_margin_pct ?? 0,
  }));

  if (chartData.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Margin trend data not available.</p>;
  }

  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer height="100%" width="100%">
        <LineChart data={chartData} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "var(--muted)" }} tickLine={false} />
          <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "var(--muted)" }} tickFormatter={(value) => `${value}%`} tickLine={false} width={52} />
          <Tooltip formatter={(value, name) => [`${Number(value ?? 0)}%`, name === "ebitda" ? "EBITDA Margin" : "PAT Margin"]} />
          <Line dataKey="ebitda" dot={{ r: 3 }} isAnimationActive={false} stroke="var(--blue)" strokeWidth={2} type="monotone" />
          <Line dataKey="pat" dot={{ r: 3 }} isAnimationActive={false} stroke="var(--green)" strokeWidth={2} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
