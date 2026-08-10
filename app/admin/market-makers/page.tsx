import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { MarketMaker } from "@/types/ipo";

export const dynamic = "force-dynamic";

type AdminRow = Record<string, unknown>;

export default async function MarketMakersAdminPage() {
  const makers = isSupabaseConfigured()
    ? await safeRows<MarketMaker>(supabaseAdmin.from("market_makers").select("*").order("name"))
    : [];

  const withSource = makers.filter((maker) => maker.source_url || maker.source).length;
  const missingSebi = makers.filter((maker) => !maker.sebi_registration_no).length;

  return (
    <>
      <AdminPageHeader
        title="Market Makers"
        subtitle="Maintain SME market maker and liquidity support data for the SME score model."
      />

      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="Market makers" value={String(makers.length)} />
        <AdminStatCard label="With source" value={String(withSource)} />
        <AdminStatCard label="Missing SEBI registration" value={String(missingSebi)} />
        <AdminStatCard label="Score impact" value="8 pts" helper="SME liquidity model" />
      </section>

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Add / edit market maker</h2>
          <div className="admin-form-grid">
            {["Name", "Slug", "SEBI registration number", "Website", "Source", "Source URL"].map((field) => (
              <label key={field}>
                <span>{field}</span>
                <input placeholder={field} />
              </label>
            ))}
            <label>
              <span>Description / liquidity notes</span>
              <textarea placeholder="Source-backed market maker notes, liquidity support quality, adverse flags if any." />
            </label>
          </div>
          <p className="admin-muted">Verified market maker data can improve the SME liquidity score; missing data uses conservative weighting.</p>
        </div>

        <div className="admin-panel">
          <h2>IPO liquidity support fields</h2>
          <div className="admin-form-grid">
            {["IPO", "Market maker", "Obligation details", "Inventory details", "Liquidity support period", "Source URL"].map((field) => (
              <label key={field}>
                <span>{field}</span>
                <input placeholder={field} />
              </label>
            ))}
          </div>
          <p className="admin-muted">Link these fields from the IPO admin SME Signals tab for each SME IPO.</p>
        </div>
      </section>

      <section className="admin-panel">
        <AdminDataTable<AdminRow>
          columns={[
            { key: "name", label: "Name" },
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
            { key: "source", label: "Source", render: (row) => asString(row.source, "Manual / pending") },
            { key: "source_url", label: "Source URL", render: (row) => (typeof row.source_url === "string" && row.source_url ? "Linked" : "Missing") },
            { key: "confidence", label: "Confidence", render: (row) => <AdminStatusBadge>{row.source_url ? "Medium" : "Low"}</AdminStatusBadge> },
            { key: "updated_at", label: "Updated", render: (row) => formatDateTime(row.updated_at) },
          ]}
          emptyMessage="No market makers have been added yet."
          rows={makers as unknown as AdminRow[]}
        />
      </section>
    </>
  );
}
