"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { IPOObjectOfIssue } from "@/types/ipo";

interface ObjectsOfIssueChartProps {
  objects: IPOObjectOfIssue[];
}

const colors = ["#111827", "#1d4ed8", "#15803d", "#b45309", "#6b7280", "#b91c1c"];

export default function ObjectsOfIssueChart({ objects }: ObjectsOfIssueChartProps) {
  const chartData = objects.map((object) => ({
    name: object.object_name,
    value: object.amount_cr ?? object.percentage ?? 0,
  }));

  if (chartData.length === 0) {
    return <p style={{ color: "var(--muted)", fontSize: 13 }}>Objects of issue data not available.</p>;
  }

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer height="100%" width="100%">
        <PieChart>
          <Pie data={chartData} dataKey="value" innerRadius={58} nameKey="name" outerRadius={92} paddingAngle={2}>
            {chartData.map((entry, index) => (
              <Cell fill={colors[index % colors.length]} key={entry.name} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`₹${Number(value ?? 0)}Cr`, "Amount"]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
