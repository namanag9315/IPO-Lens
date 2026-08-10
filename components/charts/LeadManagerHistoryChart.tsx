"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/components/charts/ChartCard";
import CustomTooltip from "@/components/charts/CustomTooltip";
import EmptyChartState from "@/components/charts/EmptyChartState";
import { CHART_COLORS, formatPercent } from "@/components/charts/chartFormatters";
import type { LeadManagerIPOHistory } from "@/types/ipo";

export default function LeadManagerHistoryChart({ history }: { history: LeadManagerIPOHistory[] }) {
  const chartData = history
    .filter((row) => row.listing_gain_percent !== null)
    .slice(0, 10)
    .map((row) => ({
      listing: row.listing_gain_percent ?? null,
      name: row.ipo_name.replace(/\s+IPO$/i, ""),
    }));

  return (
    <ChartCard eyebrow="SME manager history" title="Past IPO performance">
      {chartData.length === 0 ? (
        <EmptyChartState message="Lead manager IPO history has not been added yet." />
      ) : (
        <div className="analysis-chart-frame">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} margin={{ bottom: 2, left: 0, right: 8, top: 12 }}>
              <CartesianGrid stroke={CHART_COLORS.line} strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="name" interval={0} tick={{ fill: CHART_COLORS.slate, fontSize: 10 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickFormatter={(value) => `${value}%`} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip formatter={(value) => formatPercent(value)} />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="listing" name="Listing gain" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell
                    fill={entry.listing === null ? CHART_COLORS.slate : entry.listing > 0 ? CHART_COLORS.green : entry.listing < -10 ? CHART_COLORS.red : CHART_COLORS.amber}
                    key={entry.name}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
