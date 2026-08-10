import Link from "next/link";
import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

const csvExample = `ipo_name,exchange,ipo_type,price_band,issue_price,lot_size,issue_date,listing_price,listing_gain_percent,source_url
Example SME IPO,NSE SME,SME,72-76,76,1600,2026-06-01,84,10.53,https://source.example/ipo`;

export default function LeadManagerHistoryAdminPage({ params }: { params: { id: string } }) {
  return (
    <>
      <AdminPageHeader
        title="Lead Manager IPO History"
        subtitle="Paste source-backed SME IPO history rows, then recalculate the track-record score."
        actions={
          <>
            <AdminActionButton endpoint={`/api/admin/lead-managers/${params.id}/recalculate`} label="Recalculate score" />
            <Link className="ui-button ui-button-secondary" href={`/admin/lead-managers/${params.id}`}>
              Back to detail
            </Link>
          </>
        }
      />

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Add past IPO record</h2>
          <div className="admin-form-grid">
            {[
              "IPO name",
              "IPO type",
              "Exchange",
              "Price band",
              "Issue price",
              "Lot size",
              "Issue date",
              "Listing date",
              "Listing price",
              "Listing gain %",
              "30-day close",
              "30-day return %",
              "90-day close",
              "90-day return %",
              "Current price",
              "Current return %",
              "Total subscription",
              "Retail subscription",
              "Issue size",
              "Market maker",
              "Source",
              "Source URL",
              "Confidence",
            ].map((field) => (
              <label key={field}>
                <span>{field}</span>
                <input placeholder={field} />
              </label>
            ))}
          </div>
          <p className="admin-muted">Manual persistence can be connected to a protected admin action. Keep every row source-backed.</p>
        </div>

        <div className="admin-panel">
          <h2>Bulk CSV paste</h2>
          <label className="admin-full-field">
            <span>CSV rows</span>
            <textarea defaultValue={csvExample} />
          </label>
          <p className="admin-muted">30-day and 90-day fields are optional at first. Missing survival data lowers score confidence.</p>
        </div>
      </section>
    </>
  );
}
