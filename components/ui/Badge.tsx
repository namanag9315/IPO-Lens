import type { ReactNode } from "react";

type BadgeTone = "green" | "blue" | "amber" | "red" | "slate";

interface BadgeProps {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
}

export default function Badge({ children, className = "", tone = "slate" }: BadgeProps) {
  return <span className={`ui-badge ui-badge-${tone} ${className}`}>{children}</span>;
}
