import type { ReactNode } from "react";

interface ChartCardProps {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  note?: string;
}

export default function ChartCard({ children, eyebrow, note, title }: ChartCardProps) {
  return (
    <div className="analysis-chart-card">
      <div className="analysis-chart-head">
        <div>
          {eyebrow ? <span>{eyebrow}</span> : null}
          <h3>{title}</h3>
        </div>
        {note ? <p>{note}</p> : null}
      </div>
      {children}
    </div>
  );
}
