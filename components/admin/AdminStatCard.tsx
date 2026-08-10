import type { ReactNode } from "react";

export default function AdminStatCard({
  helper,
  icon,
  label,
  tone = "neutral",
  value,
}: {
  helper?: string;
  icon?: ReactNode;
  label: string;
  tone?: "neutral" | "green" | "amber" | "red" | "blue";
  value: ReactNode;
}) {
  return (
    <article className={`admin-stat-card admin-stat-${tone}`}>
      <div>
        <span>{label}</span>
        <strong className="mono">{value}</strong>
        {helper ? <p>{helper}</p> : null}
      </div>
      {icon ? <div className="admin-stat-icon">{icon}</div> : null}
    </article>
  );
}
