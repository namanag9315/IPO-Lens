import Link from "next/link";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminLeadManagerImportForm from "@/components/admin/AdminLeadManagerImportForm";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { LeadManager, LeadManagerTrackRecordScore } from "@/types/ipo";

export const dynamic = "force-dynamic";

type AdminRow = Record<string, unknown>;

interface ManagerRow extends LeadManager {
  history_count?: Array<{ count: number }>;
}

function scoreLabel(score: number | null | undefined) {
  if (score === null || score === undefined) return "Unknown";
  if (score >= 75) return "Strong";
  if (score >= 55) return "Mixed-positive";
  if (score >= 35) return "Mixed/limited";
  return "Weak";
}

export default async function LeadManagersAdminPage() {
  const [managers, scores] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<ManagerRow>(supabaseAdmin.from("lead_managers").select("*, history_count:lead_manager_ipo_history(count)").order("name")),
        safeRows<LeadManagerTrackRecordScore>(
          supabaseAdmin.from("lead_manager_track_record_scores").select("*").order("calculated_at", { ascending: false }),
        ),
      ])
    : [[], []];

  const latestScoreByManager = new Map<string, LeadManagerTrackRecordScore>();
  for (const score of scores) {
    if (!latestScoreByManager.has(score.lead_manager_id)) latestScoreByManager.set(score.lead_manager_id, score);
  }

  const rows: AdminRow[] = managers.map((manager) => {
    const score = latestScoreByManager.get(manager.id);
    return {
      ...manager,
      average_listing_gain_percent: score?.average_listing_gain_percent ?? null,
      history_count_value: manager.history_count?.[0]?.count ?? 0,
      median_listing_gain_percent: score?.median_listing_gain_percent ?? null,
      positive_listing_percent: score?.positive_listing_percent ?? null,
      severe_negative_count: score?.severe_negative_count ?? 0,
      track_record_label: scoreLabel(score?.final_track_record_score),
      track_record_score: score?.final_track_record_score ?? null,
    };
  });

  const missingHistory = rows.filter((row) => Number(row.history_count_value ?? 0) === 0).length;
  const strongRecords = rows.filter((row) => Number(row.track_record_score ?? 0) >= 75).length;
  const weakRecords = rows.filter((row) => row.track_record_score !== null && Number(row.track_record_score) < 35).length;
  const needsReview = rows.filter((row) => asString(row.import_status).toLowerCase() === "needs_review").length;

  return (
    <>
      <AdminPageHeader
        title="Lead Managers"
        subtitle="Manage SME merchant banker profiles, imported history, score quality and source confidence."
        actions={
          <>
            <Link className="ui-button ui-button-secondary" href="/admin/lead-managers/new">
              Add lead manager
            </Link>
          </>
        }
      />

      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="Lead managers" value={String(rows.length)} />
        <AdminStatCard label="Missing history" value={String(missingHistory)} />
        <AdminStatCard label="Needs review" tone={needsReview ? "amber" : "green"} value={String(needsReview)} />
        <AdminStatCard label="Strong / weak" value={`${strongRecords} / ${weakRecords}`} />
      </section>

      <section className="admin-panel">
        <h2>Import from public source</h2>
        <p className="admin-muted">Use public lead-manager reference pages only with attribution. Review parsed rows before relying on the score.</p>
        <AdminLeadManagerImportForm compact />
      </section>

      <section className="admin-panel">
        <div className="admin-filter-bar">
          <input placeholder="Search by manager name" />
          <select defaultValue="">
            <option value="">All records</option>
            <option>Strong</option>
            <option>Mixed</option>
            <option>Weak</option>
            <option>Missing SEBI registration</option>
            <option>Missing history</option>
          </select>
          <select defaultValue="">
            <option value="">All confidence</option>
            <option>High confidence</option>
            <option>Medium confidence</option>
            <option>Low confidence</option>
          </select>
        </div>

        <AdminDataTable<AdminRow>
          columns={[
            {
              key: "name",
              label: "Lead manager",
              render: (row) => (
                <Link className="admin-table-link" href={`/admin/lead-managers/${String(row.id)}`}>
                  {asString(row.name)}
                </Link>
              ),
            },
            { key: "sebi_registration_no", label: "SEBI registration", render: (row) => asString(row.sebi_registration_no, "Missing") },
            {
              key: "website",
              label: "Website",
              render: (row) =>
                typeof row.website === "string" && row.website ? (
                  <a className="admin-table-link" href={row.website} rel="noreferrer" target="_blank">
                    Open
                  </a>
                ) : (
                  "NA"
                ),
            },
            { key: "import_status", label: "Import status", render: (row) => <AdminStatusBadge>{asString(row.import_status, "not_started")}</AdminStatusBadge> },
            { key: "discovery_confidence", label: "Discovery", render: (row) => asString(row.discovery_confidence, asString(row.data_confidence, "medium")) },
            { key: "history_count_value", label: "IPOs managed" },
            { key: "positive_listing_percent", label: "Positive listing %", render: (row) => `${row.positive_listing_percent ?? "NA"}%` },
            { key: "average_listing_gain_percent", label: "Avg gain", render: (row) => `${row.average_listing_gain_percent ?? "NA"}%` },
            { key: "median_listing_gain_percent", label: "Median gain", render: (row) => `${row.median_listing_gain_percent ?? "NA"}%` },
            { key: "severe_negative_count", label: "Severe negatives" },
            { key: "track_record_score", label: "Score", render: (row) => String(row.track_record_score ?? "NA") },
            { key: "track_record_label", label: "Record", render: (row) => <AdminStatusBadge>{asString(row.track_record_label)}</AdminStatusBadge> },
            { key: "last_imported_at", label: "Last imported", render: (row) => formatDateTime(row.last_imported_at) },
          ]}
          emptyMessage="No lead managers have been added yet."
          rows={rows}
        />
      </section>
    </>
  );
}
