"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import ChartCard from "@/components/charts/ChartCard";
import CustomTooltip from "@/components/charts/CustomTooltip";
import EmptyChartState from "@/components/charts/EmptyChartState";
import { CHART_COLORS, formatCrore } from "@/components/charts/chartFormatters";
import type { IPOObjectOfIssue } from "@/types/ipo";

const COLORS = [CHART_COLORS.blue, CHART_COLORS.green, CHART_COLORS.amber, CHART_COLORS.navy, CHART_COLORS.red];

export default function ObjectsOfIssueDonut({ objects }: { objects: IPOObjectOfIssue[] }) {
  const chartData = objects
    .filter((object) => object.amount_cr !== null || object.percentage !== null)
    .map((object) => ({
      name: object.category ?? object.object_name,
      value: object.amount_cr ?? object.percentage ?? 0,
    }));

  return (
    <ChartCard eyebrow="Use of proceeds" title="Objects allocation">
      {chartData.length === 0 ? (
        <EmptyChartState message="Objects of issue have not been added yet." />
      ) : (
        <div className="analysis-donut-layout">
          <div className="analysis-chart-frame compact">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip formatter={(value) => formatCrore(value)} />} />
                <Pie data={chartData} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={2}>
                  {chartData.map((entry, index) => (
                    <Cell fill={COLORS[index % COLORS.length]} key={entry.name} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="analysis-donut-legend">
            {chartData.map((entry, index) => (
              <span key={entry.name}>
                <i style={{ background: COLORS[index % COLORS.length] }} />
                {entry.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
