import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { requireAdminPage } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();

  return (
    <div className="admin-shell">
      <AdminSidebar />
      <div className="admin-main">
        <AdminTopbar admin={admin} />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
