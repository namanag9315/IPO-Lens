"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/components/charts/ChartCard";
import CustomTooltip from "@/components/charts/CustomTooltip";
import EmptyChartState from "@/components/charts/EmptyChartState";
import { CHART_COLORS, formatPercent } from "@/components/charts/chartFormatters";
import type { LeadManagerIPOHistory } from "@/types/ipo";

export default function PostListingSurvivalChart({ history }: { history: LeadManagerIPOHistory[] }) {
  const chartData = history
    .filter((row) => row.listing_gain_percent !== null || row.day_30_return_percent !== null || row.day_90_return_percent !== null)
    .filter((row) => row.day_30_return_percent !== null || row.day_90_return_percent !== null)
    .slice(0, 8)
    .map((row) => ({
      day30: row.day_30_return_percent ?? null,
      day90: row.day_90_return_percent ?? null,
      listing: row.listing_gain_percent ?? null,
      name: row.ipo_name.replace(/\s+IPO$/i, ""),
    }));

  return (
    <ChartCard eyebrow="Post-listing survival" title="Listing vs 30/90-day performance">
      {chartData.length === 0 ? (
        <EmptyChartState message="30-day and 90-day post-listing data has not been added yet." />
      ) : (
        <div className="analysis-chart-frame">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} margin={{ bottom: 2, left: 0, right: 8, top: 12 }}>
              <CartesianGrid stroke={CHART_COLORS.line} strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="name" interval={0} tick={{ fill: CHART_COLORS.slate, fontSize: 10 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickFormatter={(value) => `${value}%`} tickLine={false} width={52} />
              <Tooltip content={<CustomTooltip formatter={(value) => formatPercent(value)} />} cursor={{ fill: "#F8FAFC" }} />
              <Legend iconType="circle" wrapperStyle={{ color: CHART_COLORS.slate, fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="listing" fill={CHART_COLORS.blue} name="Listing day" radius={[6, 6, 0, 0]} />
              <Bar dataKey="day30" fill={CHART_COLORS.amber} name="30-day" radius={[6, 6, 0, 0]} />
              <Bar dataKey="day90" fill={CHART_COLORS.green} name="90-day" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
