"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Info, Lightbulb } from "lucide-react";

export default function ExplainBox({
  children,
  type = "info",
}: {
  children: ReactNode;
  type?: "info" | "warning" | "tip";
}) {
  const Icon = type === "warning" ? AlertTriangle : type === "tip" ? Lightbulb : Info;

  return (
    <div className={`analysis-explain-box ${type}`}>
      <Icon aria-hidden="true" size={17} />
      <div>{children}</div>
    </div>
  );
}
