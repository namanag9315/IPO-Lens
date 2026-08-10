import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isAutoSyncDisabled } from "@/lib/ipo-engine-clean/killSwitch";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { AlertTriangle, Database, RefreshCw, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

type AdminRow = Record<string, unknown>;

function duration(row: AdminRow) {
  const value = typeof row.duration_ms === "number" ? row.duration_ms : null;
  if (value === null) return "NA";
  return value < 1000 ? `${value}ms` : `${(value / 1000).toFixed(1)}s`;
}

export default async function DataEnginePage() {
  const disabled = isAutoSyncDisabled();
  const [runs, sources, staged] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<AdminRow>(supabaseAdmin.from("ipo_sync_runs_clean").select("*").order("started_at", { ascending: false }).limit(12)),
        safeRows<AdminRow>(supabaseAdmin.from("ipo_sources_clean").select("*").order("provider").order("source_type")),
        safeRows<AdminRow>(
          supabaseAdmin
            .from("ipo_source_records_clean")
            .select("id,status,record_type,provider")
            .in("status", ["needs_review", "ignored", "rejected"])
            .limit(300),
        ),
      ])
    : [[], [], []];

  const lastRun = runs[0];
  const needsReview = staged.filter((row) => row.status === "needs_review").length;
  const failedRuns = runs.filter((row) => row.status === "failed").length;

  return (
    <>
      <AdminPageHeader
        eyebrow="Clean IPO engine"
        title="Data Engine"
        subtitle="Controlled source syncs that stage records first, match safely, dedupe snapshots and only write approved canonical facts."
        actions={
          <>
            <AdminActionButton disabled={disabled} endpoint="/api/admin/ipo-engine/full" label="Run Full Sync" />
            <AdminActionButton disabled={disabled} endpoint="/api/admin/ipo-engine/ipo-list" label="Run IPO List" />
            <AdminActionButton disabled={disabled} endpoint="/api/admin/ipo-engine/detail" label="Run Detail Sync" />
            <AdminActionButton disabled={disabled} endpoint="/api/admin/ipo-engine/gmp" label="Run GMP Sync" />
            <AdminActionButton disabled={disabled} endpoint="/api/admin/ipo-engine/subscription" label="Run Subscription" />
          </>
        }
      />

      {disabled ? (
        <section className="admin-warning-note">
          <strong>Auto sync disabled.</strong> `DISABLE_AUTO_SYNC=true` is active, so cron routes and admin sync buttons are intentionally blocked from writing to Supabase.
        </section>
      ) : null}

      <section className="admin-grid admin-grid-4">
        <AdminStatCard icon={<ShieldCheck size={20} />} label="Kill switch" tone={disabled ? "amber" : "green"} value={disabled ? "ON" : "OFF"} />
        <AdminStatCard icon={<RefreshCw size={20} />} helper={formatDateTime(lastRun?.started_at)} label="Last clean sync" value={asString(lastRun?.sync_type, "Never")} />
        <AdminStatCard icon={<AlertTriangle size={20} />} helper="Source records requiring operator review" label="Needs review" tone={needsReview ? "amber" : "green"} value={needsReview} />
        <AdminStatCard icon={<Database size={20} />} helper="Recent clean engine failures" label="Failed runs" tone={failedRuns ? "red" : "green"} value={failedRuns} />
      </section>

      <section className="admin-panel">
        <h2>Recent Clean Sync Runs</h2>
        <AdminDataTable<AdminRow>
          columns={[
            { key: "started_at", label: "Started", render: (row) => formatDateTime(row.started_at) },
            { key: "sync_type", label: "Type" },
            { key: "provider", label: "Provider", render: (row) => asString(row.provider, "Clean engine") },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
            { key: "found", label: "Found" },
            { key: "matched", label: "Matched" },
            { key: "saved", label: "Saved" },
            { key: "skipped", label: "Skipped" },
            { key: "duration_ms", label: "Duration", render: duration },
          ]}
          emptyMessage="No clean sync runs yet. Apply the clean migration first, then run a manual sync."
          rows={runs}
        />
      </section>

      <section className="admin-panel">
        <h2>Clean Source Configuration</h2>
        <AdminDataTable<AdminRow>
          columns={[
            { key: "provider", label: "Provider" },
            { key: "source_type", label: "Type" },
            { key: "is_enabled", label: "Enabled", render: (row) => (row.is_enabled ? "Yes" : "No") },
            { key: "supports_auto_fetch", label: "Auto fetch", render: (row) => (row.supports_auto_fetch ? "Yes" : "No") },
            { key: "priority", label: "Priority" },
            { key: "base_url", label: "URL", render: (row) => asString(row.base_url, "Not configured") },
          ]}
          emptyMessage="No clean sources found. Run the clean migration."
          rows={sources}
        />
      </section>
    </>
  );
}
