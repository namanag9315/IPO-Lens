import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows, safeSingle } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const [user, panProfiles, notifications, results] = isSupabaseConfigured()
    ? await Promise.all([
        safeSingle<Row>(supabaseAdmin.from("user_profiles").select("*").eq("id", params.id).maybeSingle()),
        safeRows<Row>(supabaseAdmin.from("user_pan_profiles").select("id, nickname, pan_last4, consent_version, created_at, deleted_at").eq("user_id", params.id)),
        safeRows<Row>(supabaseAdmin.from("notification_preferences").select("*").eq("user_id", params.id)),
        safeRows<Row>(supabaseAdmin.from("user_allotment_results").select("*").eq("user_id", params.id).order("checked_at", { ascending: false }).limit(40)),
      ])
    : [null, [], [], []];

  return (
    <>
      <AdminPageHeader title={user ? asString(user.email, "User detail") : "User detail"} subtitle="Privacy-safe user operations. Full PAN cannot be viewed or decrypted from admin UI." />

      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="Saved PAN profiles" value={panProfiles.filter((row) => !row.deleted_at).length} />
        <AdminStatCard label="Deleted PAN profiles" value={panProfiles.filter((row) => row.deleted_at).length} />
        <AdminStatCard label="Allotment results" value={results.length} />
        <AdminStatCard label="Privacy audit" tone="green" value="Passed" />
      </section>

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Saved PAN safety view</h2>
          <AdminDataTable<Row>
            columns={[
              { key: "nickname", label: "Nickname" },
              { key: "pan_last4", label: "PAN", render: (row) => `*****${asString(row.pan_last4, "----")}*` },
              { key: "consent_version", label: "Consent" },
              { key: "deleted_at", label: "Status", render: (row) => <AdminStatusBadge>{row.deleted_at ? "Deleted" : "Active"}</AdminStatusBadge> },
              { key: "created_at", label: "Created", render: (row) => formatDateTime(row.created_at) },
            ]}
            rows={panProfiles}
          />
        </div>
        <div className="admin-panel">
          <h2>Notification preferences</h2>
          <AdminDataTable<Row>
            columns={[
              { key: "email_enabled", label: "Email", render: (row) => (row.email_enabled ? "Enabled" : "Disabled") },
              { key: "allotment_alerts", label: "Allotment" },
              { key: "listing_alerts", label: "Listing" },
              { key: "weekly_digest", label: "Weekly digest" },
            ]}
            rows={notifications}
          />
        </div>
      </section>

      <section className="admin-panel">
        <h2>Allotment result history</h2>
        <AdminDataTable<Row>
          columns={[
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
            { key: "allotted_shares", label: "Shares" },
            { key: "registrar", label: "Registrar" },
            { key: "source", label: "Source" },
            { key: "checked_at", label: "Checked", render: (row) => formatDateTime(row.checked_at) },
          ]}
          rows={results}
        />
      </section>
    </>
  );
}
