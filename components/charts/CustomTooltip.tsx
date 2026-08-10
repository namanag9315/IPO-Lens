"use client";

import type { ReactNode } from "react";

type TooltipPayload = Array<{
  color?: string;
  dataKey?: string;
  name?: string;
  value?: number | string;
}>;

interface CustomTooltipProps {
  active?: boolean;
  formatter?: (value: number | string | undefined, name: string | undefined) => ReactNode;
  label?: string;
  payload?: TooltipPayload;
}

export default function CustomTooltip({ active, formatter, label, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="analysis-chart-tooltip">
      {label ? <strong>{label}</strong> : null}
      {payload.map((entry) => (
        <span key={`${entry.dataKey}-${entry.name}`}>
          <i style={{ background: entry.color ?? "var(--primary-navy)" }} />
          {entry.name ?? entry.dataKey}: {formatter ? formatter(entry.value, entry.name ?? entry.dataKey) : entry.value}
        </span>
      ))}
    </div>
  );
}
