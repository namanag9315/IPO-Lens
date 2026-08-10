import Link from "next/link";
import AdminActionButton from "@/components/admin/AdminActionButton";
import CleanDetailUrlForm from "@/components/admin/CleanDetailUrlForm";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatCr, formatDate, formatDateTime, formatMoney, formatPct, formatTimes, timeAgo } from "@/lib/admin/format";
import { safeRows, safeSingle } from "@/lib/admin/safeQuery";
import { isAutoSyncDisabled } from "@/lib/ipo-engine-clean/killSwitch";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type AdminRow = Record<string, unknown>;
type DetailProviderConfig = {
  label: string;
  placeholder: string;
  provider: "CHITTORGARH" | "IPOPLATFORM" | "FINOLOGY_TICKER" | "IPOWATCH" | "INVESTORGAIN";
};

const DETAIL_PROVIDER_CONFIGS: DetailProviderConfig[] = [
  { label: "Chittorgarh detail URL", placeholder: "https://www.chittorgarh.com/ipo/...", provider: "CHITTORGARH" },
  { label: "IPOPlatform detail URL", placeholder: "https://www.ipoplatform.com/ipo/...", provider: "IPOPLATFORM" },
  { label: "Finology Ticker detail URL", placeholder: "https://ticker.finology.in/ipo/sme/...", provider: "FINOLOGY_TICKER" },
  { label: "IPOWatch detail URL", placeholder: "https://ipowatch.in/...", provider: "IPOWATCH" },
  { label: "InvestorGain detail URL", placeholder: "https://www.investorgain.com/...", provider: "INVESTORGAIN" },
];

function displayFactValue(value: unknown, display?: unknown) {
  if (typeof display === "string" && display.trim()) return display;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object") return JSON.stringify(value).slice(0, 180);
  return "NA";
}

function factValuePreview(value: unknown, display?: unknown) {
  if (Array.isArray(value) || (value && typeof value === "object")) {
    const preview = JSON.stringify(value, null, 2);
    return (
      <details>
        <summary>{typeof display === "string" && display.trim() ? display : "Open preview"}</summary>
        <pre className="admin-code-block">{preview.slice(0, 4000)}</pre>
      </details>
    );
  }
  return displayFactValue(value, display);
}

function scalarDisplay(value: unknown, fallback = "") {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return String(value);
  return asString(value, fallback);
}

function latestDebugForIPO(rows: AdminRow[], ipoId: string) {
  for (const row of rows) {
    const debug = row.debug_json as Record<string, unknown> | null | undefined;
    const items = Array.isArray(debug?.detailDebug) ? debug.detailDebug as AdminRow[] : [];
    const match = items.find((item) => item.ipoId === ipoId);
    if (match) return { run: row, detail: match };
  }
  return null;
}

function latestDetailUrls(rows: AdminRow[]) {
  const urls = new Map<string, string>();
  for (const row of rows) {
    const provider = asString(row.provider, "");
    if (!urls.has(provider) && row.record_type === "detail" && typeof row.source_url === "string") {
      urls.set(provider, row.source_url);
    }
  }
  return urls;
}

function providerAttempts(detail: AdminRow) {
  return Array.isArray(detail.providersTried) ? (detail.providersTried as AdminRow[]) : [];
}

function fieldCoverage(detail: AdminRow) {
  return detail.fieldCoverage && typeof detail.fieldCoverage === "object" ? (detail.fieldCoverage as AdminRow) : null;
}

export default async function IPOAdminDetailPage({ params }: { params: { id: string } }) {
  const disabled = isAutoSyncDisabled();
  const [ipo, facts, gmpRows, subscriptionRows, sourceRows, detailRuns] = isSupabaseConfigured()
    ? await Promise.all([
        safeSingle<AdminRow>(supabaseAdmin.from("ipos").select("*").eq("id", params.id).maybeSingle()),
        safeRows<AdminRow>(supabaseAdmin.from("ipo_facts_clean").select("*").eq("ipo_id", params.id).order("fact_key")),
        safeRows<AdminRow>(supabaseAdmin.from("ipo_gmp_history_clean").select("*").eq("ipo_id", params.id).order("captured_at", { ascending: false }).limit(40)),
        safeRows<AdminRow>(
          supabaseAdmin.from("ipo_subscription_history_clean").select("*").eq("ipo_id", params.id).order("captured_at", { ascending: false }).limit(40),
        ),
        safeRows<AdminRow>(
          supabaseAdmin.from("ipo_source_records_clean").select("*").eq("matched_ipo_id", params.id).order("created_at", { ascending: false }).limit(80),
        ),
        safeRows<AdminRow>(
          supabaseAdmin.from("ipo_sync_runs_clean").select("*").eq("sync_type", "detail").order("started_at", { ascending: false }).limit(20),
        ),
      ])
    : [null, [], [], [], [], []];

  if (!ipo) {
    return <AdminPageHeader title="IPO not found" subtitle="The IPO record may have been archived or Supabase is not configured." />;
  }

  const latestGmp = gmpRows[0];
  const latestSub = subscriptionRows[0];
  const latestDetailDebug = latestDebugForIPO(detailRuns, params.id);
  const detailUrls = latestDetailUrls(sourceRows);

  return (
    <>
      <AdminPageHeader
        title={asString(ipo.name)}
        subtitle={`${asString(ipo.category)} · ${asString(ipo.exchange, "NSE/BSE")} · Clean canonical admin view`}
        actions={
          <>
            <AdminActionButton disabled={disabled} endpoint="/api/admin/ipo-engine/detail" label="Run clean detail sync" body={{ ipoId: params.id }} />
            <Link className="ui-button ui-button-primary" href="/admin/data-engine">
              Data Engine
            </Link>
            <Link className="ui-button ui-button-secondary" href={`/ipo/${asString(ipo.slug)}`}>
              Public page
            </Link>
          </>
        }
      />

      {disabled ? <p className="admin-warning-note">Sync writes are blocked because `DISABLE_AUTO_SYNC=true` is active.</p> : null}

      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="Status" value={<AdminStatusBadge>{asString(ipo.status)}</AdminStatusBadge>} />
        <AdminStatCard label="Price band high" value={formatMoney(ipo.price_band_high)} />
        <AdminStatCard label="Issue size" value={formatCr(ipo.issue_size_cr)} />
        <AdminStatCard label="Lot size" value={asString(String(ipo.lot_size ?? "NA"))} />
        <AdminStatCard helper={timeAgo(latestGmp?.captured_at)} label="Clean GMP" value={formatMoney(latestGmp?.gmp_value)} />
        <AdminStatCard helper={timeAgo(latestSub?.captured_at)} label="Clean total subscription" value={formatTimes(latestSub?.total_x)} />
        <AdminStatCard label="Open date" value={formatDate(ipo.open_date)} />
        <AdminStatCard label="Listing date" value={formatDate(ipo.listing_date)} />
      </section>

      <section className="admin-panel">
        <h2>Core IPO Row</h2>
        <div className="admin-form-grid">
          {[
            ["Name", ipo.name],
            ["Slug", ipo.slug],
            ["Status", ipo.status],
            ["Category", ipo.category],
            ["Exchange", ipo.exchange],
            ["Open date", ipo.open_date],
            ["Close date", ipo.close_date],
            ["Allotment date", ipo.allotment_date],
            ["Listing date", ipo.listing_date],
            ["Registrar", ipo.registrar_name],
          ].map(([label, value]) => (
            <label key={String(label)}>
              <span>{String(label)}</span>
              <input readOnly value={asString(value, "")} />
            </label>
          ))}
        </div>
      </section>

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Detail Source Override</h2>
          <p className="admin-muted">
            Add exact provider detail pages when automatic discovery cannot find them. Detail/GMP/subscription providers still cannot create IPO master rows.
          </p>
          <div style={{ display: "grid", gap: 16 }}>
            {DETAIL_PROVIDER_CONFIGS.map((item) => (
              <CleanDetailUrlForm
                initialUrl={detailUrls.get(item.provider)}
                ipoId={params.id}
                key={item.provider}
                label={item.label}
                placeholder={item.placeholder}
                provider={item.provider}
              />
            ))}
          </div>
        </div>

        <div className="admin-panel">
          <h2>Detail Source Attempts</h2>
          {latestDetailDebug && providerAttempts(latestDetailDebug.detail).length > 0 ? (
            <AdminDataTable<AdminRow>
              columns={[
                { key: "provider", label: "Provider" },
                { key: "fetchStatus", label: "HTTP", render: (row) => scalarDisplay(row.fetchStatus, "NA") },
                { key: "htmlLength", label: "HTML" },
                { key: "textLength", label: "Text" },
                { key: "isValidIPOPage", label: "Valid", render: (row) => (row.isValidIPOPage ? "Yes" : "No") },
                { key: "isInterstitialOnly", label: "Interstitial", render: (row) => (row.isInterstitialOnly ? "Yes" : "No") },
                { key: "isCaptchaOrBlocked", label: "Blocked", render: (row) => (row.isCaptchaOrBlocked ? "Yes" : "No") },
                { key: "factsDetected", label: "Facts" },
                { key: "factsSaved", label: "Saved" },
                { key: "finalReason", label: "Result", render: (row) => asString(row.finalReason, "NA") },
              ]}
              emptyMessage="No provider attempts were logged."
              rows={providerAttempts(latestDetailDebug.detail)}
            />
          ) : latestDetailDebug ? (
            <div className="admin-form-grid">
              {[
                ["Detail URL attempted", latestDetailDebug.detail.detailUrlAttempted],
                ["Fetch status", latestDetailDebug.detail.fetch && typeof latestDetailDebug.detail.fetch === "object" ? (latestDetailDebug.detail.fetch as AdminRow).status : null],
                ["Blocked", latestDetailDebug.detail.fetch && typeof latestDetailDebug.detail.fetch === "object" ? String((latestDetailDebug.detail.fetch as AdminRow).blocked) : null],
                ["HTML length", latestDetailDebug.detail.fetch && typeof latestDetailDebug.detail.fetch === "object" ? (latestDetailDebug.detail.fetch as AdminRow).htmlLength : null],
                ["Table count", latestDetailDebug.detail.extraction && typeof latestDetailDebug.detail.extraction === "object" ? (latestDetailDebug.detail.extraction as AdminRow).tableCount : null],
                ["Fact keys detected", latestDetailDebug.detail.parser && typeof latestDetailDebug.detail.parser === "object" ? ((latestDetailDebug.detail.parser as AdminRow).factKeysDetected as string[] | undefined)?.join(", ") : null],
                ["Facts saved", latestDetailDebug.detail.save && typeof latestDetailDebug.detail.save === "object" ? (latestDetailDebug.detail.save as AdminRow).factsSaved : null],
                ["Warnings/errors", [...(((latestDetailDebug.detail.parser as AdminRow)?.warnings as string[] | undefined) ?? []), ...(((latestDetailDebug.detail.parser as AdminRow)?.errors as string[] | undefined) ?? [])].join(" | ")],
              ].map(([label, value]) => (
                <label key={String(label)}>
                  <span>{String(label)}</span>
                  <input readOnly value={scalarDisplay(value)} />
                </label>
              ))}
            </div>
          ) : (
            <p className="admin-muted">No detail sync debug is available yet. Run clean detail sync for this IPO.</p>
          )}
          {latestDetailDebug && providerAttempts(latestDetailDebug.detail).length > 0 ? (
            <div className="admin-form-grid" style={{ marginTop: 16 }}>
              {[
                ["Selected provider", latestDetailDebug.detail.selectedProvider],
                ["Final status", latestDetailDebug.detail.finalStatus],
                ["First URL attempted", latestDetailDebug.detail.detailUrlAttempted],
              ].map(([label, value]) => (
                <label key={String(label)}>
                  <span>{String(label)}</span>
                  <input readOnly value={scalarDisplay(value)} />
                </label>
              ))}
            </div>
          ) : null}
          {latestDetailDebug && fieldCoverage(latestDetailDebug.detail) ? (
            <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
              <h3>Field Coverage</h3>
              <div className="admin-form-grid">
                {[
                  ["Coverage", `${scalarDisplay(fieldCoverage(latestDetailDebug.detail)?.parserCoveragePct, "0")}%`],
                  ["Detected", ((fieldCoverage(latestDetailDebug.detail)?.detectedFactKeys as string[] | undefined) ?? []).join(", ")],
                  ["Validated", ((fieldCoverage(latestDetailDebug.detail)?.validatedFactKeys as string[] | undefined) ?? []).join(", ")],
                  ["Saved", ((fieldCoverage(latestDetailDebug.detail)?.savedFactKeys as string[] | undefined) ?? []).join(", ")],
                  ["Missing", ((fieldCoverage(latestDetailDebug.detail)?.missingFactKeys as string[] | undefined) ?? []).join(", ")],
                ].map(([label, value]) => (
                  <label key={String(label)}>
                    <span>{String(label)}</span>
                    <input readOnly value={scalarDisplay(value)} />
                  </label>
                ))}
              </div>
              {Array.isArray(fieldCoverage(latestDetailDebug.detail)?.rejectedFactKeys) && (fieldCoverage(latestDetailDebug.detail)?.rejectedFactKeys as unknown[]).length > 0 ? (
                <AdminDataTable<AdminRow>
                  columns={[
                    { key: "factKey", label: "Rejected fact" },
                    { key: "reason", label: "Reason" },
                    { key: "valuePreview", label: "Value preview", render: (row) => asString(row.valuePreview, "NA") },
                  ]}
                  emptyMessage="No rejected facts."
                  rows={(fieldCoverage(latestDetailDebug.detail)?.rejectedFactKeys as AdminRow[]) ?? []}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="admin-panel">
        <h2>Clean Canonical Facts</h2>
        <p className="admin-muted">Only validated facts from `ipo_facts_clean` should feed the public IPO detail page. Admin-verified facts are protected from automatic overwrites.</p>
        <AdminDataTable<AdminRow>
          columns={[
            { key: "fact_key", label: "Fact" },
            { key: "display_value", label: "Value", render: (row) => factValuePreview(row.fact_value, row.display_value) },
            { key: "source_provider", label: "Source" },
            { key: "confidence", label: "Confidence", render: (row) => <AdminStatusBadge>{asString(row.confidence)}</AdminStatusBadge> },
            { key: "admin_verified", label: "Verified", render: (row) => (row.admin_verified ? "Yes" : "No") },
            { key: "updated_at", label: "Updated", render: (row) => formatDateTime(row.updated_at) },
          ]}
          emptyMessage="No clean facts saved yet. Run clean detail sync after a Chittorgarh IPO list URL is staged for this IPO."
          rows={facts}
        />
      </section>

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Clean GMP History</h2>
          <AdminDataTable<AdminRow>
            columns={[
              { key: "gmp_value", label: "GMP", render: (row) => formatMoney(row.gmp_value) },
              { key: "gmp_pct", label: "GMP %", render: (row) => formatPct(row.gmp_pct) },
              { key: "source_provider", label: "Source" },
              { key: "captured_at", label: "Captured", render: (row) => formatDateTime(row.captured_at) },
            ]}
            emptyMessage="No clean GMP rows yet."
            rows={gmpRows}
          />
        </div>

        <div className="admin-panel">
          <h2>Clean Subscription History</h2>
          <AdminDataTable<AdminRow>
            columns={[
              { key: "qib_x", label: "QIB", render: (row) => formatTimes(row.qib_x) },
              { key: "nii_x", label: "NII", render: (row) => formatTimes(row.nii_x) },
              { key: "retail_x", label: "Retail", render: (row) => formatTimes(row.retail_x) },
              { key: "total_x", label: "Total", render: (row) => formatTimes(row.total_x) },
              { key: "source_provider", label: "Source" },
              { key: "captured_at", label: "Captured", render: (row) => formatDateTime(row.captured_at) },
            ]}
            emptyMessage="No clean subscription rows yet."
            rows={subscriptionRows}
          />
        </div>
      </section>

      <section className="admin-panel">
        <h2>Staged Source Records</h2>
        <AdminDataTable<AdminRow>
          columns={[
            { key: "created_at", label: "Created", render: (row) => formatDateTime(row.created_at) },
            { key: "provider", label: "Provider" },
            { key: "record_type", label: "Type" },
            { key: "raw_name", label: "Raw name" },
            { key: "match_confidence", label: "Match" },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
            { key: "source_url", label: "Source URL", render: (row) => asString(row.source_url, "NA") },
          ]}
          emptyMessage="No clean source records are staged for this IPO yet."
          rows={sourceRows}
        />
      </section>
    </>
  );
}
