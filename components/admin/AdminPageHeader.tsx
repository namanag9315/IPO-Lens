import type { ReactNode } from "react";

export default function AdminPageHeader({
  actions,
  eyebrow = "Admin",
  subtitle,
  title,
}: {
  actions?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
}) {
  return (
    <div className="admin-page-header">
      <div>
        <span>{eyebrow}</span>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className="admin-page-actions">{actions}</div> : null}
    </div>
  );
}
