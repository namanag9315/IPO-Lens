import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime, formatTimes, timeAgo } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { estimateRetailAllotmentChance } from "@/lib/allotment/estimateRetailAllotmentChance";
import { getDataFreshness } from "@/lib/ipo-data/dataFreshness";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SnapshotRow = Record<string, unknown> & { ipo?: { name?: string | null; category?: string | null } | null };
type IPORow = { id: string; name: string };

export default async function AdminSubscriptionPage() {
  const [snapshots, ipos] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<SnapshotRow>(
          supabaseAdmin
            .from("ipo_subscription_snapshots")
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
        title="Subscription Management"
        subtitle="Review QIB, NII, retail and total subscription snapshots from public reference sources with freshness and allotment estimate context."
        actions={<AdminActionButton endpoint="/api/admin/ipo-engine/subscription" label="Run subscription sync now" />}
      />

      <div className="admin-warning-note">Subscription data may be delayed. Verify with official exchange sources before making decisions.</div>

      <section className="admin-panel">
        <h2>Emergency manual subscription override</h2>
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
          {["QIB times", "NII times", "Retail times", "Employee times", "Shareholder times", "Total times", "Source", "Source URL", "Confidence"].map((field) => (
            <label key={field}>
              <span>{field}</span>
              <input placeholder={field} />
            </label>
          ))}
        </div>
        <p>Saving a manual row recalculates retail allotment probability on the public IPO page.</p>
      </section>

      <section className="admin-panel">
        <h2>Latest subscription snapshots</h2>
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
            { key: "qib_times", label: "QIB", render: (row) => formatTimes(row.qib_times) },
            { key: "nii_times", label: "NII", render: (row) => formatTimes(row.nii_times) },
            { key: "retail_times", label: "Retail", render: (row) => formatTimes(row.retail_times) },
            { key: "total_times", label: "Total", render: (row) => <strong>{formatTimes(row.total_times)}</strong> },
            {
              key: "allotment",
              label: "Allotment est.",
              render: (row) => {
                const chance = estimateRetailAllotmentChance(typeof row.retail_times === "number" ? row.retail_times : null);
                return chance.chancePercent === null ? "NA" : `~${chance.chancePercent}%`;
              },
            },
            { key: "source", label: "Source", render: (row) => asString(row.source) },
            { key: "freshness", label: "Freshness", render: (row) => <AdminStatusBadge>{getDataFreshness(asString(row.captured_at, ""))}</AdminStatusBadge> },
            { key: "captured_at", label: "Captured", render: (row) => `${formatDateTime(row.captured_at)} · ${timeAgo(row.captured_at)}` },
          ]}
          rows={snapshots}
        />
      </section>
    </>
  );
}
