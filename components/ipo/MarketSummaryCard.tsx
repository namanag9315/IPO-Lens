import type { ReactNode } from "react";
import Card from "@/components/ui/Card";

interface MarketSummaryCardProps {
  accent?: "navy" | "green" | "amber" | "red";
  explanation: string;
  icon: ReactNode;
  label: string;
  sparkline?: number[];
  value: string;
}

function color(accent: MarketSummaryCardProps["accent"]) {
  switch (accent) {
    case "green":
      return "var(--green)";
    case "amber":
      return "var(--amber)";
    case "red":
      return "var(--red)";
    default:
      return "var(--primary-navy)";
  }
}

export default function MarketSummaryCard({ accent = "navy", explanation, icon, label, sparkline, value }: MarketSummaryCardProps) {
  const max = Math.max(...(sparkline ?? []), 1);

  return (
    <Card className="summary-card">
      <div className="summary-icon" style={{ color: color(accent) }}>
        {icon}
      </div>
      <div>
        <span>{label}</span>
        <strong className="mono" style={{ color: color(accent) }}>
          {value}
        </strong>
        <p>{explanation}</p>
      </div>
      {sparkline ? (
        <div className="summary-spark" aria-hidden="true">
          {sparkline.map((item, index) => (
            <i key={`${item}-${index}`} style={{ height: `${Math.max(5, (item / max) * 34)}px` }} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}
