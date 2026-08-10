"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/components/charts/ChartCard";
import CustomTooltip from "@/components/charts/CustomTooltip";
import EmptyChartState from "@/components/charts/EmptyChartState";
import { CHART_COLORS, formatCrore } from "@/components/charts/chartFormatters";
import type { IPOFinancialYearly } from "@/types/ipo";

export default function RevenuePATChart({ data }: { data: IPOFinancialYearly[] }) {
  const chartData = data.map((row) => ({
    pat: row.pat_cr ?? 0,
    revenue: row.revenue_cr ?? 0,
    year: row.financial_year,
  }));

  return (
    <ChartCard eyebrow="Financial trend" title="Revenue and PAT">
      {chartData.length === 0 ? (
        <EmptyChartState message="Revenue and profit rows have not been imported for this IPO." />
      ) : (
        <div className="analysis-chart-frame">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} margin={{ bottom: 2, left: 0, right: 8, top: 12 }}>
              <CartesianGrid stroke={CHART_COLORS.line} strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="year" tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickFormatter={(value) => `₹${value}Cr`} tickLine={false} width={68} />
              <Tooltip content={<CustomTooltip formatter={(value) => formatCrore(value)} />} cursor={{ fill: "#F8FAFC" }} />
              <Legend iconType="circle" wrapperStyle={{ color: CHART_COLORS.slate, fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="revenue" fill={CHART_COLORS.blue} name="Revenue" radius={[6, 6, 0, 0]} />
              <Bar dataKey="pat" fill={CHART_COLORS.green} name="PAT" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
