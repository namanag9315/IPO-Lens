import Link from "next/link";
import type { ReactNode } from "react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import CompanyLogo from "@/components/ui/CompanyLogo";

interface IPOEventRow {
  badge?: {
    label: string;
    tone: "green" | "blue" | "amber" | "red" | "slate";
  };
  href?: string;
  meta: ReactNode;
  right?: ReactNode;
  title: string;
  domain?: string;
}

interface IPOEventCardProps {
  accent: "green" | "blue" | "amber" | "purple";
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

  if (accent === "purple") {
    return "var(--purple)";
  }

  return "var(--blue)";
}

export default function IPOEventCard({ accent, count, ctaHref, ctaLabel, description, emptyText, icon, rows, title }: IPOEventCardProps) {
  const color = accentColor(accent);

  return (
    <Card className="ipo-event-card" style={{ ["--event-accent" as string]: color }}>
      <div className="ipo-event-head">
        <div className="ipo-event-icon">{icon}</div>
        <div>
          <span>{title}</span>
          <strong className="mono">{count}</strong>
          <p>{description}</p>
        </div>
      </div>

      <div className="ipo-event-list">
        {rows.length === 0 ? (
          <p className="ipo-event-empty">{emptyText}</p>
        ) : (
          rows.slice(0, 3).map((row) => (
            <div className="ipo-event-row" key={row.title}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {row.domain && (
                  <div className="ipo-avatar relative flex items-center justify-center" style={{ width: 24, height: 24, fontSize: 8, flexShrink: 0 }}>
                    <CompanyLogo domain={row.domain} name={row.title} />
                  </div>
                )}
                <div>
                  {row.href ? (
                    <Link href={row.href}>{row.title}</Link>
                  ) : (
                    <span>{row.title}</span>
                  )}
                  <p>{row.meta}</p>
                </div>
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
