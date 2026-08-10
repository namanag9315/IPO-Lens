"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/components/charts/ChartCard";
import CustomTooltip from "@/components/charts/CustomTooltip";
import EmptyChartState from "@/components/charts/EmptyChartState";
import { CHART_COLORS, formatCrore } from "@/components/charts/chartFormatters";
import type { IPOAnchorInvestor } from "@/types/ipo";

export default function AnchorAllocationChart({ investors }: { investors: IPOAnchorInvestor[] }) {
  const chartData = investors
    .filter((investor) => investor.amount_cr !== null || investor.percent_of_anchor_book !== null)
    .slice()
    .sort((a, b) => (b.amount_cr ?? 0) - (a.amount_cr ?? 0))
    .slice(0, 8)
    .map((investor) => ({ amount: investor.amount_cr ?? 0, investor: investor.investor_name }));

  return (
    <ChartCard eyebrow="Anchor book" title="Top anchor allocation">
      {chartData.length === 0 ? (
        <EmptyChartState message="Anchor allocation details are not available for this IPO." />
      ) : (
        <div className="analysis-chart-frame">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} layout="vertical" margin={{ bottom: 2, left: 12, right: 12, top: 12 }}>
              <CartesianGrid stroke={CHART_COLORS.line} strokeDasharray="3 3" horizontal={false} />
              <XAxis axisLine={false} tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickFormatter={(value) => `₹${value}Cr`} tickLine={false} type="number" />
              <YAxis axisLine={false} dataKey="investor" tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickLine={false} type="category" width={128} />
              <Tooltip content={<CustomTooltip formatter={(value) => formatCrore(value)} />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="amount" fill={CHART_COLORS.navy} name="Amount" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
