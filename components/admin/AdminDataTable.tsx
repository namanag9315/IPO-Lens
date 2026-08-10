import type { ReactNode } from "react";
import AdminEmptyState from "@/components/admin/AdminEmptyState";

export interface AdminTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
}

export default function AdminDataTable<T extends Record<string, unknown>>({
  columns,
  emptyMessage = "No records found.",
  rows,
}: {
  columns: Array<AdminTableColumn<T>>;
  emptyMessage?: string;
  rows: T[];
}) {
  if (rows.length === 0) {
    return <AdminEmptyState description={emptyMessage} title="Nothing to show yet" />;
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={String(row.id ?? rowIndex)}>
              {columns.map((column) => (
                <td key={column.key}>{column.render ? column.render(row) : (row[column.key] as ReactNode)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
