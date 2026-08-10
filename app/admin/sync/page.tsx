import AdminActionButton from "@/components/admin/AdminActionButton";
import Link from "next/link";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime, timeAgo } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SyncLog = Record<string, unknown>;

const primarySyncCards: Array<{
  body?: Record<string, unknown>;
  dataType: string;
  description?: string;
  endpoint: string;
  label: string;
  title: string;
}> = [
  {
    body: { financialsOnly: true, limit: 20 },
    dataType: "detail",
    description: "Processes up to 20 IPOs that still have no verified yearly financials.",
    endpoint: "/api/admin/ipo-engine/detail",
    label: "Repair Missing Financials",
    title: "Financial Coverage Repair",
  },
  {
    dataType: "gmp",
    endpoint: "/api/admin/ipo-engine/gmp",
    label: "Run GMP Sync Now",
    title: "GMP Sync",
  },
  {
    dataType: "subscription",
    endpoint: "/api/admin/ipo-engine/subscription",
    label: "Run Subscription Sync Now",
    title: "Subscription Sync",
  },
  {
    dataType: "full",
    endpoint: "/api/admin/ipo-engine/full",
    label: "Run Full Public Data Sync Now",
    title: "Full Public Data Sync",
  },
  {
    dataType: "detail",
    endpoint: "/api/admin/ipo-engine/detail",
    label: "Run Full IPO Detail Import Now",
    title: "Full IPO Detail Import",
  },
];

const secondarySyncCards = [

  { endpoint: "/api/admin/sync/ai-summaries", label: "Generate AI summaries", title: "AI Summary Generation", body: { limit: 10 } },
  { endpoint: "/api/admin/sync/notifications", label: "Generate notifications", title: "Notification Generation" },
  { endpoint: "/api/admin/providers/test", label: "Check provider health", title: "Provider Health Check", body: { providerKey: "ipo_guru_gmp" } },
];

function duration(row: SyncLog) {
  if (typeof row.duration_ms === "number") {
    const seconds = Math.max(0, Math.round(row.duration_ms / 1000));
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  }
  if (typeof row.started_at !== "string" || typeof row.finished_at !== "string") return "NA";
  const started = new Date(row.started_at).getTime();
  const finished = new Date(row.finished_at).getTime();
  if (!Number.isFinite(started) || !Number.isFinite(finished)) return "NA";
  const seconds = Math.max(0, Math.round((finished - started) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function lastFor(logs: SyncLog[], dataType: string) {
  return logs.find((log) => String(log.sync_type) === dataType);
}

export default async function AdminSyncPage() {
  const [logs, leadDiscoveryLogs, leadImportJobs] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<SyncLog>(supabaseAdmin.from("ipo_sync_runs_clean").select("*").order("started_at", { ascending: false }).limit(120)),
        safeRows<SyncLog>(supabaseAdmin.from("lead_manager_discovery_logs").select("*").order("created_at", { ascending: false }).limit(80)),
        safeRows<SyncLog>(supabaseAdmin.from("lead_manager_import_jobs").select("*").order("created_at", { ascending: false }).limit(80)),
      ])
    : [[], [], []];

  return (
    <>
      <AdminPageHeader
        title="Sync Center"
        subtitle="Run public-source syncs securely from server-side admin routes. The browser never receives CRON_SECRET or service-role keys."
      />

      <section className="admin-grid admin-grid-3">
        {primarySyncCards.map((card) => {
          const last = lastFor(logs, card.dataType);
          return (
            <div className="admin-panel admin-sync-card" key={card.title}>
              <h2>{card.title}</h2>
              {card.description ? <p className="admin-muted">{card.description}</p> : null}
              <AdminActionButton endpoint={card.endpoint} label={card.label} body={card.body} />
              <div className="admin-grid admin-grid-2 admin-sync-stats">
                <AdminStatCard label="Last status" value={last ? <AdminStatusBadge>{asString(last.status)}</AdminStatusBadge> : "Never"} />
                <AdminStatCard helper={last ? timeAgo(last.started_at) : "No run yet"} label="Last run" value={last ? formatDateTime(last.started_at) : "Never"} />
                <AdminStatCard label="Records found" value={String(last?.found ?? 0)} />
                <AdminStatCard label="Records saved" value={String(last?.saved ?? 0)} />
                <AdminStatCard label="Skipped" value={String(last?.skipped ?? 0)} />
                <AdminStatCard label="Duration" value={last ? duration(last) : "NA"} />
              </div>
              <p className="admin-muted">Provider: {asString(last?.provider, "not run yet")}</p>
              {Array.isArray(last?.errors) && last.errors.length > 0 ? <p className="admin-warning-note">{last.errors.join(", ")}</p> : null}
            </div>
          );
        })}
      </section>

      <section className="admin-grid admin-grid-3">
        <div className="admin-panel">
          <h2>Unmatched Records Review</h2>
          <p className="admin-muted">Review, link or ignore records with 70-84 match confidence.</p>
          <Link href="/admin/sync/unmatched" className="admin-button">
            Review Queue
          </Link>
        </div>
        {secondarySyncCards.map((card) => (
          <div className="admin-panel" key={card.title}>
            <h2>{card.title}</h2>
            <p className="admin-muted">Operational utility. Runs through protected admin API routes only.</p>
            <AdminActionButton endpoint={card.endpoint} label={card.label} body={card.body} />
          </div>
        ))}
      </section>

      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="Recent runs" value={logs.length} />
        <AdminStatCard label="Successful" tone="green" value={logs.filter((log) => String(log.status).toUpperCase() === "SUCCESS").length} />
        <AdminStatCard label="Partial" tone="amber" value={logs.filter((log) => String(log.status).toUpperCase().includes("PARTIAL")).length} />
        <AdminStatCard label="Failed" tone="red" value={logs.filter((log) => String(log.status).toUpperCase() === "FAILED").length} />
      </section>

      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="Lead managers discovered" value={leadDiscoveryLogs.filter((log) => asString(log.status).toUpperCase() === "FOUND").length} />
        <AdminStatCard label="Imports queued" value={leadImportJobs.filter((job) => asString(job.status).toLowerCase() === "queued").length} />
        <AdminStatCard label="Imports failed" tone="red" value={leadImportJobs.filter((job) => asString(job.status).toLowerCase() === "failed").length} />
        <AdminStatCard label="Needs review" tone="amber" value={leadDiscoveryLogs.filter((log) => asString(log.status).toUpperCase() === "LOW_CONFIDENCE").length} />
      </section>

      <section className="admin-panel">
        <h2>Recent sync logs</h2>
        <AdminDataTable<SyncLog>
          columns={[
            { key: "started_at", label: "Date", render: (row) => formatDateTime(row.started_at) },
            { key: "provider", label: "Provider" },
            { key: "sync_type", label: "Type" },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
            { key: "found", label: "Found" },
            { key: "matched", label: "Matched" },
            { key: "saved", label: "Saved" },
            { key: "skipped", label: "Skipped" },
            { key: "duration", label: "Duration", render: (row) => duration(row) },
            { key: "errors", label: "Error", render: (row) => (Array.isArray(row.errors) && row.errors.length > 0 ? row.errors.join(", ") : "-") },
          ]}
          rows={logs}
        />
      </section>
    </>
  );
}
