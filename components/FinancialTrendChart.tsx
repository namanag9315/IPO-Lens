"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { IPOFinancialYearly } from "@/types/ipo";

interface FinancialTrendChartProps {
  data: IPOFinancialYearly[];
}

export default function FinancialTrendChart({ data }: FinancialTrendChartProps) {
  const chartData = data.map((row) => ({
    year: row.financial_year,
    revenue: row.revenue_cr ?? 0,
    pat: row.pat_cr ?? 0,
  }));

  if (chartData.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Financial trend data not available.</p>;
  }

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={chartData} margin={{ bottom: 0, left: 0, right: 8, top: 8 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="year" tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "var(--muted)" }} tickLine={false} />
          <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "var(--muted)" }} tickFormatter={(value) => `₹${value}Cr`} tickLine={false} width={64} />
          <Tooltip formatter={(value, name) => [`₹${Number(value ?? 0)}Cr`, name === "revenue" ? "Revenue" : "PAT"]} />
          <Bar dataKey="revenue" fill="var(--blue)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="pat" fill="var(--green)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
