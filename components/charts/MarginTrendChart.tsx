"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/components/charts/ChartCard";
import CustomTooltip from "@/components/charts/CustomTooltip";
import EmptyChartState from "@/components/charts/EmptyChartState";
import { CHART_COLORS, formatPercent } from "@/components/charts/chartFormatters";
import type { IPOFinancialYearly } from "@/types/ipo";

export default function MarginTrendChart({ data }: { data: IPOFinancialYearly[] }) {
  const chartData = data
    .filter((row) => row.pat_margin_pct !== null || row.ebitda_margin_pct !== null)
    .map((row) => ({
      ebitdaMargin: row.ebitda_margin_pct ?? null,
      patMargin: row.pat_margin_pct ?? null,
      year: row.financial_year,
    }));

  return (
    <ChartCard eyebrow="Margin quality" title="EBITDA and PAT margin">
      {chartData.length === 0 ? (
        <EmptyChartState message="Margin data is not available yet." />
      ) : (
        <div className="analysis-chart-frame">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={chartData} margin={{ bottom: 2, left: 0, right: 8, top: 12 }}>
              <CartesianGrid stroke={CHART_COLORS.line} strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="year" tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickFormatter={(value) => `${value}%`} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip formatter={(value) => formatPercent(value)} />} />
              <Legend iconType="circle" wrapperStyle={{ color: CHART_COLORS.slate, fontSize: 12, paddingTop: 8 }} />
              <Line connectNulls dataKey="ebitdaMargin" dot={{ r: 3 }} name="EBITDA margin" stroke={CHART_COLORS.blue} strokeWidth={2.5} type="monotone" />
              <Line connectNulls dataKey="patMargin" dot={{ r: 3 }} name="PAT margin" stroke={CHART_COLORS.green} strokeWidth={2.5} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
