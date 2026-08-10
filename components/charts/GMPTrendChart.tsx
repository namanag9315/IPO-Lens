"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/components/charts/ChartCard";
import CustomTooltip from "@/components/charts/CustomTooltip";
import EmptyChartState from "@/components/charts/EmptyChartState";
import { CHART_COLORS, formatRupee, shortDateLabel } from "@/components/charts/chartFormatters";
import type { GMPHistory } from "@/types/ipo";

export default function GMPTrendChart({ history }: { history: GMPHistory[] }) {
  const chartData = history
    .slice()
    .sort((a, b) => a.captured_at.localeCompare(b.captured_at))
    .map((row) => ({ date: row.captured_at, gmp: row.gmp_value, label: shortDateLabel(row.captured_at) }));

  return (
    <ChartCard eyebrow="Unofficial sentiment" note="GMP is capped in scoring" title="GMP trend">
      {chartData.length < 2 ? (
        <EmptyChartState message="At least two GMP snapshots are needed for a trend chart." />
      ) : (
        <div className="analysis-chart-frame">
          <ResponsiveContainer height="100%" width="100%">
            <LineChart data={chartData} margin={{ bottom: 2, left: 0, right: 8, top: 12 }}>
              <CartesianGrid stroke={CHART_COLORS.line} strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="label" tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickFormatter={(value) => `₹${value}`} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip formatter={(value) => formatRupee(value)} />} />
              <Line dataKey="gmp" dot={{ r: 3 }} name="GMP" stroke={CHART_COLORS.amber} strokeWidth={2.6} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
