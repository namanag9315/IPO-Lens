import Link from "next/link";
import AdminLeadManagerImportForm from "@/components/admin/AdminLeadManagerImportForm";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

export const dynamic = "force-dynamic";

export default function NewLeadManagerAdminPage() {
  return (
    <>
      <AdminPageHeader
        title="Add Lead Manager"
        subtitle="Create a merchant banker profile or import source-backed history from a public lead-manager page."
        actions={
          <Link className="ui-button ui-button-secondary" href="/admin/lead-managers">
            Back to lead managers
          </Link>
        }
      />

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Profile fields</h2>
          <div className="admin-form-grid">
            {[
              "Name",
              "Slug",
              "Type",
              "SEBI registration number",
              "Website",
              "Phone",
              "Email",
              "Address",
              "Source name",
              "Source URL",
              "Data confidence",
            ].map((field) => (
              <label key={field}>
                <span>{field}</span>
                <input placeholder={field} />
              </label>
            ))}
            <label>
              <span>Description</span>
              <textarea placeholder="Write an IPO Lens-original profile note after source verification." />
            </label>
          </div>
          <p className="admin-muted">Manual save can be connected to a protected admin mutation. Do not paste copied source text without rewriting and attribution.</p>
        </div>

        <div className="admin-panel">
          <h2>Import from public source</h2>
          <p className="admin-muted">This uses lightweight server-side fetch and Cheerio parsing only. It stores the source URL and recalculates the track-record score.</p>
          <AdminLeadManagerImportForm />
        </div>
      </section>
    </>
  );
}
