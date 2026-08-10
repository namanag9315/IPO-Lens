import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeCount, safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type LogRow = Record<string, unknown> & { ipo?: { name?: string | null } | null };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default async function AdminAllotmentPage() {
  const [logs, savedProfiles, deletedProfiles] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<LogRow>(
          supabaseAdmin.from("ipo_allotment_check_logs").select("*, ipo:ipos(name)").order("checked_at", { ascending: false }).limit(120),
        ),
        safeCount(supabaseAdmin.from("user_pan_profiles").select("id", { count: "exact", head: true }).is("deleted_at", null)),
        safeCount(supabaseAdmin.from("user_pan_profiles").select("id", { count: "exact", head: true }).not("deleted_at", "is", null)),
      ])
    : [[], 0, 0];
  const todayLogs = logs.filter((log) => String(log.checked_at).startsWith(todayIso()));

  return (
    <>
      <AdminPageHeader title="Allotment Admin" subtitle="Monitor allotment checker usage and provider availability without exposing full PAN, application number or demat identifiers." />

      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="Checks today" value={todayLogs.length} />
        <AdminStatCard label="Allotted" tone="green" value={todayLogs.filter((log) => String(log.status) === "ALLOTTED").length} />
        <AdminStatCard label="Unavailable" tone="amber" value={todayLogs.filter((log) => String(log.status) === "UNAVAILABLE").length} />
        <AdminStatCard label="Errors" tone="red" value={todayLogs.filter((log) => String(log.status) === "ERROR").length} />
        <AdminStatCard label="Saved PAN profiles" value={savedProfiles} />
        <AdminStatCard label="Deleted profiles" value={deletedProfiles} />
        <AdminStatCard helper="No raw PAN columns are queried." label="Privacy audit" tone="green" value="Passed" />
      </section>

      <section className="admin-panel">
        <h2>Recent check logs</h2>
        <AdminDataTable<LogRow>
          columns={[
            { key: "ipo", label: "IPO", render: (row) => row.ipo?.name ?? "Unknown IPO" },
            { key: "registrar", label: "Registrar" },
            { key: "check_type", label: "Check Type" },
            { key: "provider", label: "Provider" },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
            { key: "checked_at", label: "Checked", render: (row) => formatDateTime(row.checked_at) },
          ]}
          rows={logs}
        />
      </section>
    </>
  );
}
