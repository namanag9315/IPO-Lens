import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type AdminRow = Record<string, unknown>;

function ipoName(row: AdminRow) {
  const ipo = row.ipo as { name?: string; slug?: string } | null | undefined;
  return ipo?.name ?? "Unknown IPO";
}

function fieldValue(row: AdminRow) {
  const display = asString(row.display_value, "");
  if (display) return display;
  const value = row.field_value;
  return typeof value === "string" ? value : JSON.stringify(value ?? "");
}

export default async function AdminEnrichmentPage() {
  const [jobs, fields, snapshots] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<AdminRow>(supabaseAdmin.from("ipo_enrichment_jobs").select("*, ipo:ipos(name, slug)").order("created_at", { ascending: false }).limit(120)),
        safeRows<AdminRow>(supabaseAdmin.from("ipo_enriched_fields").select("*, ipo:ipos(name, slug)").order("created_at", { ascending: false }).limit(160)),
        safeRows<AdminRow>(supabaseAdmin.from("ipo_source_snapshots").select("id, ipo_id, source_name, source_type, captured_at").order("captured_at", { ascending: false }).limit(120)),
      ])
    : [[], [], []];

  const needsReview = fields.filter((field) => asString(field.status) === "needs_review");
  const autoAppliedToday = fields.filter((field) => asString(field.status) === "auto_applied" && asString(field.applied_at).slice(0, 10) === new Date().toISOString().slice(0, 10));
  const queued = jobs.filter((job) => asString(job.status) === "queued");
  const running = jobs.filter((job) => asString(job.status) === "running");
  const completed = jobs.filter((job) => ["completed", "partial"].includes(asString(job.status)));
  const failed = jobs.filter((job) => asString(job.status) === "failed");

  return (
    <>
      <AdminPageHeader
        eyebrow="AI enrichment"
        title="Missing Field Enrichment"
        subtitle="Source-backed Groq extraction for missing IPO fields. No source text means no save."
        actions={<AdminActionButton endpoint="/api/admin/enrichment/run" label="Run queued enrichment" body={{ limit: 5 }} />}
      />

      <section className="admin-grid admin-grid-5">
        <AdminStatCard label="Queued jobs" value={queued.length} />
        <AdminStatCard label="Running" tone="blue" value={running.length} />
        <AdminStatCard label="Completed" tone="green" value={completed.length} />
        <AdminStatCard label="Failed" tone="red" value={failed.length} />
        <AdminStatCard label="Needs review" tone="amber" value={needsReview.length} />
      </section>

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Missing Fields Queue</h2>
          <AdminDataTable<AdminRow>
            columns={[
              { key: "ipo", label: "IPO", render: (row) => ipoName(row) },
              { key: "missing_fields", label: "Missing fields", render: (row) => Array.isArray(row.missing_fields) ? row.missing_fields.join(", ") : "-" },
              { key: "source_snapshot_ids", label: "Sources", render: (row) => Array.isArray(row.source_snapshot_ids) ? String(row.source_snapshot_ids.length) : "0" },
              { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
              { key: "created_at", label: "Created", render: (row) => formatDateTime(row.created_at) },
            ]}
            rows={queued}
            emptyMessage="No queued enrichment jobs."
          />
        </div>

        <div className="admin-panel">
          <h2>Source Snapshot Coverage</h2>
          <AdminDataTable<AdminRow>
            columns={[
              { key: "source_name", label: "Source" },
              { key: "source_type", label: "Type" },
              { key: "captured_at", label: "Captured", render: (row) => formatDateTime(row.captured_at) },
            ]}
            rows={snapshots.slice(0, 12)}
            emptyMessage="No source snapshots stored yet. Run public data sync first."
          />
        </div>
      </section>

      <section className="admin-panel">
        <h2>Review Enriched Fields</h2>
        <AdminDataTable<AdminRow>
          columns={[
            { key: "ipo", label: "IPO", render: (row) => ipoName(row) },
            { key: "field_name", label: "Field" },
            { key: "display_value", label: "Suggested value", render: (row) => fieldValue(row).slice(0, 180) },
            { key: "confidence", label: "Confidence", render: (row) => <AdminStatusBadge>{asString(row.confidence)}</AdminStatusBadge> },
            { key: "source_name", label: "Source" },
            { key: "evidence_text", label: "Evidence", render: (row) => asString(row.evidence_text).slice(0, 220) },
            { key: "actions", label: "Actions", render: (row) => (
              <div className="admin-row-actions">
                <AdminActionButton endpoint={`/api/admin/enrichment/fields/${asString(row.id)}/approve`} label="Approve" />
                <AdminActionButton endpoint={`/api/admin/enrichment/fields/${asString(row.id)}/reject`} label="Reject" />
              </div>
            ) },
          ]}
          rows={needsReview}
          emptyMessage="No AI-enriched fields need review."
        />
      </section>

      <section className="admin-panel">
        <h2>Job Logs</h2>
        <AdminDataTable<AdminRow>
          columns={[
            { key: "ipo", label: "IPO", render: (row) => ipoName(row) },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
            { key: "missing_fields", label: "Fields", render: (row) => Array.isArray(row.missing_fields) ? row.missing_fields.length : 0 },
            { key: "attempts", label: "Attempts" },
            { key: "error_message", label: "Error", render: (row) => asString(row.error_message, "-").slice(0, 180) },
            { key: "created_at", label: "Created", render: (row) => formatDateTime(row.created_at) },
            { key: "finished_at", label: "Finished", render: (row) => formatDateTime(row.finished_at) },
          ]}
          rows={jobs}
          emptyMessage="No enrichment jobs yet."
        />
      </section>
    </>
  );
}
