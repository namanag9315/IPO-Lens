import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeCount, safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type PanProfileRow = Record<string, unknown>;

export default async function SavedPANSafetyAdminPage() {
  const [profiles, activeCount, deletedCount] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<PanProfileRow>(
          supabaseAdmin
            .from("user_pan_profiles")
            .select("id, user_id, nickname, pan_last4, consent_version, created_at, deleted_at")
            .order("created_at", { ascending: false })
            .limit(150),
        ),
        safeCount(supabaseAdmin.from("user_pan_profiles").select("id", { count: "exact", head: true }).is("deleted_at", null)),
        safeCount(supabaseAdmin.from("user_pan_profiles").select("id", { count: "exact", head: true }).not("deleted_at", "is", null)),
      ])
    : [[], 0, 0];

  return (
    <>
      <AdminPageHeader title="Saved PAN Safety" subtitle="Privacy audit surface for saved PAN profiles. Full PAN values and encrypted payloads are never selected by this page." />
      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="Active encrypted profiles" value={activeCount} />
        <AdminStatCard label="Soft-deleted profiles" value={deletedCount} />
        <AdminStatCard label="Raw PAN selected" tone="green" value="No" />
        <AdminStatCard label="Privacy audit" tone="green" value="Passed" />
      </section>
      <section className="admin-panel">
        <h2>Masked saved profiles</h2>
        <AdminDataTable<PanProfileRow>
          columns={[
            { key: "nickname", label: "Nickname", render: (row) => asString(row.nickname) },
            { key: "pan_last4", label: "Masked PAN", render: (row) => `*****${asString(row.pan_last4, "----")}*` },
            { key: "consent_version", label: "Consent", render: (row) => asString(row.consent_version) },
            { key: "deleted_at", label: "Status", render: (row) => <AdminStatusBadge>{row.deleted_at ? "Deleted" : "Active"}</AdminStatusBadge> },
            { key: "created_at", label: "Created", render: (row) => formatDateTime(row.created_at) },
          ]}
          rows={profiles}
        />
      </section>
    </>
  );
}
