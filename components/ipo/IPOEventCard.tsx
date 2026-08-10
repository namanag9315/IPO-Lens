import Link from "next/link";
import type { ReactNode } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

interface IPOEventRow {
  badge?: {
    label: string;
    tone: "green" | "blue" | "amber" | "red" | "slate";
  };
  href?: string;
  meta: ReactNode;
  right?: ReactNode;
  title: string;
}

interface IPOEventCardProps {
  accent: "green" | "navy" | "amber";
  count: number;
  ctaHref: string;
  ctaLabel: string;
  description: string;
  emptyText: string;
  icon: ReactNode;
  rows: IPOEventRow[];
  title: string;
}

function accentColor(accent: IPOEventCardProps["accent"]) {
  if (accent === "green") {
    return "var(--green)";
  }

  if (accent === "amber") {
    return "var(--amber)";
  }

  return "var(--primary-navy)";
}

export default function IPOEventCard({ accent, count, ctaHref, ctaLabel, description, emptyText, icon, rows, title }: IPOEventCardProps) {
  const color = accentColor(accent);

  return (
    <Card className="ipo-event-card" style={{ ["--event-accent" as string]: color }}>
      <div className="ipo-event-head">
        <div className="ipo-event-icon">{icon}</div>
        <div className="ipo-event-title">
          <span>{title}</span>
          <p>{description}</p>
        </div>
        <strong className="mono">{count}</strong>
      </div>

      <div className="ipo-event-list">
        {rows.length === 0 ? (
          <p className="ipo-event-empty">{emptyText}</p>
        ) : (
          rows.slice(0, 3).map((row) => (
            <div className="ipo-event-row" key={row.title}>
              <div>
                {row.href ? (
                  <Link href={row.href}>{row.title}</Link>
                ) : (
                  <span>{row.title}</span>
                )}
                <p>{row.meta}</p>
              </div>
              {row.right ?? (row.badge ? <Badge tone={row.badge.tone}>{row.badge.label}</Badge> : null)}
            </div>
          ))
        )}
      </div>

      <Link className="ipo-event-cta" href={ctaHref}>
        {ctaLabel} →
      </Link>
    </Card>
  );
}
