import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime, formatMoney, timeAgo } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { getDataFreshness } from "@/lib/ipo-data/dataFreshness";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SnapshotRow = Record<string, unknown> & { ipo?: { name?: string | null; category?: string | null } | null };
type IPORow = { id: string; name: string };

export default async function AdminGMPPage() {
  const [snapshots, ipos] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<SnapshotRow>(
          supabaseAdmin
            .from("ipo_gmp_snapshots")
            .select("*, ipo:ipos(name, category)")
            .order("captured_at", { ascending: false })
            .limit(150),
        ),
        safeRows<IPORow>(supabaseAdmin.from("ipos").select("id, name").or("is_duplicate.is.null,is_duplicate.eq.false").order("name")),
      ])
    : [[], []];

  return (
    <>
      <AdminPageHeader
        title="GMP Management"
        subtitle="Verify unofficial public-reference GMP snapshots, compare sources, and add emergency overrides only when providers fail."
        actions={<AdminActionButton endpoint="/api/admin/ipo-engine/gmp" label="Run GMP sync now" />}
      />

      <div className="admin-warning-note">GMP is unofficial grey market data and does not guarantee listing gains.</div>

      <section className="admin-panel">
        <h2>Emergency manual GMP override</h2>
        <div className="admin-form-grid">
          <label>
            <span>IPO</span>
            <select>
              <option>Select IPO</option>
              {ipos.map((ipo) => (
                <option key={ipo.id} value={ipo.id}>
                  {ipo.name}
                </option>
              ))}
            </select>
          </label>
          {["GMP", "GMP %", "Issue price", "Estimated listing price", "Source", "Source URL", "Confidence", "Captured at"].map((field) => (
            <label key={field}>
              <span>{field}</span>
              <input placeholder={field} />
            </label>
          ))}
        </div>
        <p>Manual rows are saved through `/api/admin/gmp` and must include source attribution. Prefer public-source sync whenever it works.</p>
      </section>

      <section className="admin-panel">
        <h2>Latest GMP snapshots</h2>
        <AdminDataTable<SnapshotRow>
          columns={[
            {
              key: "ipo",
              label: "IPO",
              render: (row) => (
                <div>
                  <strong>{row.ipo?.name ?? "Unknown IPO"}</strong>
                  <span className="admin-table-muted">{row.ipo?.category ?? "NA"}</span>
                </div>
              ),
            },
            { key: "gmp", label: "GMP", render: (row) => <strong>{formatMoney(row.gmp)}</strong> },
            { key: "gmp_percent", label: "GMP %", render: (row) => String(row.gmp_percent ?? "NA") },
            { key: "estimated_listing_price", label: "Est. listing", render: (row) => formatMoney(row.estimated_listing_price) },
            { key: "source", label: "Source", render: (row) => asString(row.source) },
            { key: "confidence", label: "Confidence", render: (row) => <AdminStatusBadge>{asString(row.confidence, "medium")}</AdminStatusBadge> },
            { key: "freshness", label: "Freshness", render: (row) => <AdminStatusBadge>{getDataFreshness(asString(row.captured_at, ""))}</AdminStatusBadge> },
            { key: "captured_at", label: "Captured", render: (row) => `${formatDateTime(row.captured_at)} · ${timeAgo(row.captured_at)}` },
          ]}
          rows={snapshots}
        />
      </section>
    </>
  );
}
