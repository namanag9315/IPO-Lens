import type { ReactNode } from "react";

export default function AdminConfirmDialog({
  children,
  description,
  title,
}: {
  children?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <details className="admin-confirm">
      <summary>{title}</summary>
      <p>{description}</p>
      {children}
    </details>
  );
}
