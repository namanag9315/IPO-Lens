import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type AuditRow = Record<string, unknown>;

export default async function AdminAuditLogsPage() {
  const logs = isSupabaseConfigured()
    ? await safeRows<AuditRow>(supabaseAdmin.from("admin_audit_logs").select("*").order("created_at", { ascending: false }).limit(150))
    : [];

  return (
    <>
      <AdminPageHeader title="Audit Logs" subtitle="Trace admin actions with sanitized payloads. Secrets and full PAN values are redacted before insert." />
      <section className="admin-panel">
        <AdminDataTable<AuditRow>
          columns={[
            { key: "created_at", label: "Date", render: (row) => formatDateTime(row.created_at) },
            { key: "action", label: "Action" },
            { key: "entity_type", label: "Entity", render: (row) => asString(row.entity_type, "-") },
            { key: "entity_id", label: "Entity ID", render: (row) => asString(row.entity_id, "-") },
            { key: "user_id", label: "User", render: (row) => asString(row.user_id, "system") },
          ]}
          rows={logs}
        />
      </section>
    </>
  );
}
