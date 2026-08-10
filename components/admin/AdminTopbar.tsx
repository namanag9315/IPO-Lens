import Link from "next/link";
import { Plus, Search } from "lucide-react";
import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import type { AdminContext } from "@/lib/admin/auth";

function environmentLabel() {
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") return "Production";
  if (process.env.VERCEL_ENV === "preview") return "Preview";
  return "Local";
}

export default function AdminTopbar({ admin }: { admin: AdminContext }) {
  return (
    <header className="admin-topbar">
      <form action="/admin/ipos" className="admin-topbar-search">
        <Search size={16} />
        <input aria-label="Admin search" name="q" placeholder="Search IPOs, users, providers..." />
      </form>

      <div className="admin-topbar-actions">
        <AdminStatusBadge tone={environmentLabel()}>{environmentLabel()}</AdminStatusBadge>
        <AdminActionButton endpoint="/api/admin/ipo-engine/full" label="Run Sync" />
        <Link className="ui-button ui-button-secondary" href="/admin/ipos/new">
          <Plus size={15} />
          Add IPO
        </Link>
        <div className="admin-user-chip">
          <strong>{admin.email}</strong>
          <span>{admin.role}</span>
        </div>
      </div>
    </header>
  );
}
