import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, timeAgo } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ProviderRow = Record<string, unknown>;

export default async function AdminProvidersPage() {
  const providers = isSupabaseConfigured()
    ? await safeRows<ProviderRow>(supabaseAdmin.from("ipo_data_providers").select("*").order("priority", { ascending: true }))
    : [];

  const guruHealth = await (async () => {
    try {
      const { checkIPOGuruHealth } = await import("@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruHealth");
      return await checkIPOGuruHealth();
    } catch {
      return { configured: false, enabled: false, ok: false, error: "Health check unavailable", keyPreview: null, status: null, durationMs: 0 };
    }
  })();

  return (
    <>
      <AdminPageHeader title="Provider Health" subtitle="Enable, prioritize, and test public-reference provider adapters without scraping exchanges or bypassing protections." />

      <section className="admin-panel">
        <h2>Registered providers</h2>
        <AdminDataTable<ProviderRow>
          columns={[
            { key: "provider_name", label: "Provider" },
            { key: "provider_type", label: "Type" },
            { key: "priority", label: "Priority" },
            { key: "is_enabled", label: "Status", render: (row) => <AdminStatusBadge>{row.is_enabled ? "Enabled" : "Disabled"}</AdminStatusBadge> },
            { key: "last_success_at", label: "Last success", render: (row) => timeAgo(row.last_success_at) },
            { key: "last_failure_at", label: "Last failure", render: (row) => timeAgo(row.last_failure_at) },
            { key: "failure_count", label: "Failures" },
            { key: "last_error", label: "Last error", render: (row) => asString(row.last_error, "-") },
            {
              key: "actions",
              label: "Test",
              render: (row) => <AdminActionButton endpoint="/api/admin/providers/test" label="Test" body={{ providerKey: row.provider_key }} />,
            },
          ]}
          rows={providers}
        />
      </section>

      <section className="admin-panel">
        <h2>IPO Guru API</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <span>Configured: <strong>{guruHealth.configured ? "Yes" : "No"}</strong></span>
          <span>Enabled: <strong>{guruHealth.enabled ? "Yes" : "No"}</strong></span>
          {guruHealth.configured && <span>Key: <code>{guruHealth.keyPreview ?? "****"}</code></span>}
          {guruHealth.ok ?
            <AdminStatusBadge>Connected</AdminStatusBadge> :
            <AdminStatusBadge>{guruHealth.error ?? "Not connected"}</AdminStatusBadge>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <AdminActionButton endpoint="/api/admin/providers/ipo-guru/health" label="Test Connection" />
          <AdminActionButton endpoint="/api/admin/ipo-engine/ipo-guru/list-sync" label="Run List Sync" />
          <AdminActionButton endpoint="/api/admin/ipo-engine/ipo-guru/gmp-sync" label="Run GMP Sync" />
          <AdminActionButton endpoint="/api/admin/ipo-engine/ipo-guru/subscription-sync" label="Run Subscription Sync" />
          <AdminActionButton endpoint="/api/admin/ipo-engine/ipo-guru/detail-sync" label="Run Detail Sync (All)" />
        </div>
      </section>
    </>
  );
}
