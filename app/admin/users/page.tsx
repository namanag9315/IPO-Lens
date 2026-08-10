import Link from "next/link";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type UserRow = Record<string, unknown>;
type PanProfileRow = { user_id: string | null; deleted_at: string | null };
type NotificationPrefRow = { user_id: string | null; email_enabled: boolean | null };

export default async function AdminUsersPage() {
  const [users, panProfiles, prefs] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<UserRow>(supabaseAdmin.from("user_profiles").select("*").order("created_at", { ascending: false }).limit(120)),
        safeRows<PanProfileRow>(supabaseAdmin.from("user_pan_profiles").select("user_id, deleted_at")),
        safeRows<NotificationPrefRow>(supabaseAdmin.from("notification_preferences").select("user_id, email_enabled")),
      ])
    : [[], [], []];
  const panCounts = new Map<string, number>();
  for (const profile of panProfiles) {
    if (!profile.user_id || profile.deleted_at) continue;
    panCounts.set(profile.user_id, (panCounts.get(profile.user_id) ?? 0) + 1);
  }
  const prefsByUser = new Map(prefs.map((pref) => [pref.user_id, pref]));

  return (
    <>
      <AdminPageHeader title="User Profiles" subtitle="View platform usage safely. This page never decrypts or displays full PAN, application or demat identifiers." />

      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="Users" value={users.length} />
        <AdminStatCard label="Saved PAN profiles" value={panProfiles.filter((row) => !row.deleted_at).length} />
        <AdminStatCard label="Deleted PAN profiles" value={panProfiles.filter((row) => row.deleted_at).length} />
        <AdminStatCard label="Email enabled" tone="blue" value={prefs.filter((row) => row.email_enabled).length} />
      </section>

      <section className="admin-panel">
        <h2>Users</h2>
        <AdminDataTable<UserRow>
          columns={[
            { key: "email", label: "Email", render: (row) => asString(row.email) },
            { key: "name", label: "Name", render: (row) => asString(row.name) },
            { key: "created_at", label: "Created", render: (row) => formatDateTime(row.created_at) },
            { key: "pan_count", label: "Saved PAN count", render: (row) => panCounts.get(String(row.id)) ?? 0 },
            { key: "email_enabled", label: "Email alerts", render: (row) => (prefsByUser.get(String(row.id))?.email_enabled ? "Enabled" : "Disabled") },
            { key: "actions", label: "Actions", render: (row) => <Link className="admin-table-link" href={`/admin/users/${row.id}`}>View privacy data</Link> },
          ]}
          rows={users}
        />
      </section>
    </>
  );
}
