"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/components/charts/ChartCard";
import CustomTooltip from "@/components/charts/CustomTooltip";
import EmptyChartState from "@/components/charts/EmptyChartState";
import { CHART_COLORS, formatTimes } from "@/components/charts/chartFormatters";
import type { SubscriptionData } from "@/types/ipo";

export default function CategorySubscriptionChart({ latest }: { latest: SubscriptionData | null }) {
  const chartData = latest
    ? [
        { category: "QIB", value: latest.qib_x },
        { category: "NII", value: latest.nii_x },
        { category: "Retail", value: latest.retail_x },
        { category: "Total", value: latest.total_x },
      ]
    : [];

  return (
    <ChartCard eyebrow="Latest category demand" title="Category-wise subscription">
      {chartData.length === 0 ? (
        <EmptyChartState message="Category subscription data is not available yet." />
      ) : (
        <div className="analysis-chart-frame compact">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} margin={{ bottom: 2, left: 0, right: 8, top: 12 }}>
              <CartesianGrid stroke={CHART_COLORS.line} strokeDasharray="3 3" vertical={false} />
              <XAxis axisLine={false} dataKey="category" tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickFormatter={(value) => `${value}x`} tickLine={false} width={48} />
              <Tooltip content={<CustomTooltip formatter={(value) => formatTimes(value)} />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="value" fill={CHART_COLORS.navy} name="Subscription" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
