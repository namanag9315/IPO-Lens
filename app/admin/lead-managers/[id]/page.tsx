import Link from "next/link";
import { notFound } from "next/navigation";
import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminLeadManagerImportForm from "@/components/admin/AdminLeadManagerImportForm";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import LeadManagerDistributionCard from "@/components/charts/LeadManagerDistributionCard";
import LeadManagerHistoryChart from "@/components/charts/LeadManagerHistoryChart";
import PostListingSurvivalChart from "@/components/charts/PostListingSurvivalChart";
import { asString, formatDate, formatDateTime, formatMoney } from "@/lib/admin/format";
import { safeRows, safeSingle } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { IPOLeadManagerWithManager, LeadManager, LeadManagerIPOHistory, LeadManagerTrackRecordScore } from "@/types/ipo";

export const dynamic = "force-dynamic";

type AdminRow = Record<string, unknown>;

function pct(value: unknown) {
  return typeof value === "number" ? `${value}%` : "NA";
}

export default async function LeadManagerAdminDetailPage({ params }: { params: { id: string } }) {
  const [manager, history, scores, linkedIpos] = isSupabaseConfigured()
    ? await Promise.all([
        safeSingle<LeadManager>(supabaseAdmin.from("lead_managers").select("*").eq("id", params.id).maybeSingle()),
        safeRows<LeadManagerIPOHistory>(
          supabaseAdmin.from("lead_manager_ipo_history").select("*").eq("lead_manager_id", params.id).order("listing_date", { ascending: false }),
        ),
        safeRows<LeadManagerTrackRecordScore>(
          supabaseAdmin.from("lead_manager_track_record_scores").select("*").eq("lead_manager_id", params.id).order("calculated_at", { ascending: false }),
        ),
        safeRows<IPOLeadManagerWithManager>(
          supabaseAdmin.from("ipo_lead_managers").select("*, ipo:ipos(id, name, slug, status, category, listing_date)").eq("lead_manager_id", params.id),
        ),
      ])
    : [null, [], [], []];

  if (!manager) notFound();

  const latestScore = scores[0] ?? null;

  return (
    <>
      <AdminPageHeader
        title={manager.name}
        subtitle="Merchant banker profile, SME IPO history, source quality, and score calculation."
        actions={
          <>
            <AdminActionButton endpoint={`/api/admin/lead-managers/${params.id}/recalculate`} label="Recalculate score" />
            <Link className="ui-button ui-button-secondary" href={`/admin/lead-managers/${params.id}/history`}>
              Add history
            </Link>
          </>
        }
      />

      <div className="admin-tabs">
        {["Profile", "Past IPOs", "Performance Analytics", "Score Calculation", "Linked Current IPOs", "Sources"].map((tab) => (
          <a href={`#${tab.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} key={tab}>
            {tab}
          </a>
        ))}
      </div>

      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="IPOs managed" value={String(latestScore?.total_ipos_managed ?? history.length)} />
        <AdminStatCard label="Positive listing rate" value={pct(latestScore?.positive_listing_percent)} />
        <AdminStatCard label="Median listing gain" value={pct(latestScore?.median_listing_gain_percent)} />
        <AdminStatCard label="Track record score" value={String(latestScore?.final_track_record_score ?? "NA")} />
        <AdminStatCard label="30-day median" value={pct(latestScore?.median_30_day_return_percent)} />
        <AdminStatCard label="90-day median" value={pct(latestScore?.median_90_day_return_percent)} />
        <AdminStatCard label="Severe negatives" value={String(latestScore?.severe_negative_count ?? 0)} />
        <AdminStatCard label="Data confidence" value={<AdminStatusBadge>{asString(manager.data_confidence, "medium")}</AdminStatusBadge>} />
      </section>

      <section className="admin-grid admin-grid-2" id="profile">
        <div className="admin-panel">
          <h2>Profile</h2>
          <div className="admin-form-grid">
            {[
              ["Name", manager.name],
              ["Slug", manager.slug],
              ["Type", manager.type],
              ["SEBI registration", manager.sebi_registration_no],
              ["Website", manager.website],
              ["Phone", manager.phone],
              ["Email", manager.email],
              ["Address", manager.address],
              ["Source", manager.source],
              ["Source URL", manager.source_url],
            ].map(([label, value]) => (
              <label key={label}>
                <span>{label}</span>
                <input defaultValue={asString(value, "")} />
              </label>
            ))}
            <label>
              <span>Description</span>
              <textarea defaultValue={asString(manager.description, "")} />
            </label>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Import / refresh</h2>
          <p className="admin-muted">Paste a source URL and review imported history. The importer is conservative and keeps source attribution.</p>
          <AdminLeadManagerImportForm />
        </div>
      </section>

      <section className="admin-grid admin-grid-2" id="performance-analytics">
        <LeadManagerHistoryChart history={history} />
        <PostListingSurvivalChart history={history} />
        <LeadManagerDistributionCard history={history} score={latestScore} />
        <div className="admin-panel">
          <h2>Score Calculation</h2>
          <AdminDataTable<AdminRow>
            columns={[
              { key: "metric", label: "Metric" },
              { key: "value", label: "Value" },
              { key: "note", label: "Why it matters" },
            ]}
            rows={[
              { id: "experience", metric: "Experience", note: "More tracked SME IPOs improves confidence.", value: latestScore?.total_ipos_managed ?? history.length },
              { id: "positive", metric: "Positive listing rate", note: "Share of IPOs that listed above issue price.", value: pct(latestScore?.positive_listing_percent) },
              { id: "median", metric: "Median listing gain", note: "Less affected by outlier listing pops.", value: pct(latestScore?.median_listing_gain_percent) },
              { id: "survival", metric: "30/90-day survival", note: "Prevents over-rewarding listing-day gains only.", value: `${pct(latestScore?.median_30_day_return_percent)} / ${pct(latestScore?.median_90_day_return_percent)}` },
              { id: "penalty", metric: "Severe negatives", note: "Listings below -20% reduce the score.", value: latestScore?.severe_negative_count ?? 0 },
            ]}
          />
        </div>
      </section>

      <section className="admin-panel" id="past-ipos">
        <h2>Past IPOs</h2>
        <AdminDataTable<AdminRow>
          columns={[
            { key: "ipo_name", label: "IPO" },
            { key: "exchange", label: "Exchange", render: (row) => asString(row.exchange, "NA") },
            { key: "ipo_type", label: "Type", render: (row) => asString(row.ipo_type, "SME") },
            { key: "price_band", label: "Price band", render: (row) => asString(row.price_band, formatMoney(row.issue_price)) },
            { key: "lot_size", label: "Lot" },
            { key: "issue_date", label: "Issue date", render: (row) => formatDate(row.issue_date) },
            { key: "listing_price", label: "Listing price", render: (row) => formatMoney(row.listing_price) },
            { key: "listing_gain_percent", label: "Gain/loss", render: (row) => pct(row.listing_gain_percent) },
            { key: "day_30_return_percent", label: "30-day", render: (row) => pct(row.day_30_return_percent) },
            { key: "day_90_return_percent", label: "90-day", render: (row) => pct(row.day_90_return_percent) },
            {
              key: "source_url",
              label: "Source",
              render: (row) =>
                typeof row.source_url === "string" && row.source_url ? (
                  <a className="admin-table-link" href={row.source_url} rel="noreferrer" target="_blank">
                    {asString(row.source, "Open")}
                  </a>
                ) : (
                  asString(row.source, "NA")
                ),
            },
          ]}
          emptyMessage="No past IPO history has been added for this lead manager."
          rows={history as unknown as AdminRow[]}
        />
      </section>

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel" id="linked-current-ipos">
          <h2>Linked Current IPOs</h2>
          <AdminDataTable<AdminRow>
            columns={[
              { key: "role", label: "Role", render: (row) => asString(row.role, "lead_manager") },
              { key: "is_primary", label: "Primary", render: (row) => (row.is_primary ? "Yes" : "No") },
              { key: "ipo_id", label: "IPO" },
            ]}
            emptyMessage="This lead manager is not linked to current IPO records yet."
            rows={linkedIpos as unknown as AdminRow[]}
          />
        </div>

        <div className="admin-panel" id="sources">
          <h2>Sources</h2>
          <AdminDataTable<AdminRow>
            columns={[
              { key: "source", label: "Source", render: (row) => asString(row.source, "NA") },
              {
                key: "source_url",
                label: "Link",
                render: (row) =>
                  typeof row.source_url === "string" && row.source_url ? (
                    <a className="admin-table-link" href={row.source_url} rel="noreferrer" target="_blank">
                      Open
                    </a>
                  ) : (
                    "NA"
                  ),
              },
              { key: "data_confidence", label: "Confidence", render: (row) => <AdminStatusBadge>{asString(row.data_confidence, "medium")}</AdminStatusBadge> },
              { key: "updated_at", label: "Updated", render: (row) => formatDateTime(row.updated_at) },
            ]}
            rows={[manager as unknown as AdminRow, ...(history as unknown as AdminRow[])]}
          />
        </div>
      </section>
    </>
  );
}
