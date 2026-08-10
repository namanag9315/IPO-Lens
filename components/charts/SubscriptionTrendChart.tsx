"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/components/charts/ChartCard";
import CustomTooltip from "@/components/charts/CustomTooltip";
import EmptyChartState from "@/components/charts/EmptyChartState";
import { CHART_COLORS, formatTimes, shortDateLabel } from "@/components/charts/chartFormatters";
import type { SubscriptionData } from "@/types/ipo";

export default function SubscriptionTrendChart({ history }: { history: SubscriptionData[] }) {
  const chartData = history
    .slice()
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    .map((row) => ({
      label: shortDateLabel(row.captured_at),
      nii: row.nii_x,
      qib: row.qib_x,
      retail: row.retail_x,
      total: row.total_x,
    }));

  return (
    <ChartCard eyebrow="Demand build-up" title="Subscription trend">
      {chartData.length === 0 ? (
        <EmptyChartState message="Subscription snapshots have not been captured yet." />
      ) : (
        <div className="analysis-chart-frame">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={chartData} margin={{ bottom: 2, left: 0, right: 8, top: 12 }}>
              <CartesianGrid stroke={CHART_COLORS.line} strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="label" tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickFormatter={(value) => `${value}x`} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip formatter={(value) => formatTimes(value)} />} />
              <Legend iconType="circle" wrapperStyle={{ color: CHART_COLORS.slate, fontSize: 12, paddingTop: 8 }} />
              <Line dataKey="qib" dot={{ r: 2 }} name="QIB" stroke={CHART_COLORS.blue} strokeWidth={2.4} type="monotone" />
              <Line dataKey="nii" dot={{ r: 2 }} name="NII" stroke={CHART_COLORS.amber} strokeWidth={2.4} type="monotone" />
              <Line dataKey="retail" dot={{ r: 2 }} name="Retail" stroke={CHART_COLORS.green} strokeWidth={2.4} type="monotone" />
              <Line dataKey="total" dot={{ r: 2 }} name="Total" stroke={CHART_COLORS.navy} strokeWidth={2.4} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
