"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChartCard from "@/components/charts/ChartCard";
import CustomTooltip from "@/components/charts/CustomTooltip";
import EmptyChartState from "@/components/charts/EmptyChartState";
import { CHART_COLORS } from "@/components/charts/chartFormatters";
import type { IPOPeerComparison, IPOValuationMetrics } from "@/types/ipo";

export default function PeerValuationChart({ peers, valuation }: { peers: IPOPeerComparison[]; valuation: IPOValuationMetrics | null }) {
  const chartData = [
    ...(valuation?.pe_ratio ? [{ name: "IPO", pe: valuation.pe_ratio }] : []),
    ...peers.filter((peer) => peer.pe_ratio !== null).slice(0, 7).map((peer) => ({ name: peer.peer_name, pe: peer.pe_ratio ?? 0 })),
  ];

  return (
    <ChartCard eyebrow="Relative valuation" title="Peer PE comparison">
      {chartData.length === 0 ? (
        <EmptyChartState message="Peer valuation data is not available yet." />
      ) : (
        <div className="analysis-chart-frame">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} layout="vertical" margin={{ bottom: 2, left: 12, right: 12, top: 12 }}>
              <CartesianGrid stroke={CHART_COLORS.line} strokeDasharray="3 3" horizontal={false} />
              <XAxis axisLine={false} tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickLine={false} type="number" />
              <YAxis axisLine={false} dataKey="name" tick={{ fill: CHART_COLORS.slate, fontSize: 11 }} tickLine={false} type="category" width={112} />
              <Tooltip content={<CustomTooltip formatter={(value) => `${Number(value ?? 0).toFixed(1)}x`} />} cursor={{ fill: "#F8FAFC" }} />
              <Bar dataKey="pe" fill={CHART_COLORS.blue} name="PE" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
