import AdminPageHeader from "@/components/admin/AdminPageHeader";

const fields = [
  "Name",
  "Slug",
  "Symbol",
  "Exchange",
  "IPO type",
  "Status",
  "Sector",
  "Price min",
  "Price max",
  "Lot size",
  "Issue size",
  "Fresh issue size",
  "OFS size",
  "Open date",
  "Close date",
  "Allotment date",
  "Listing date",
  "Registrar",
  "Lead managers",
  "RHP URL",
  "DRHP URL",
  "Official source URL",
  "Notes",
];

export default function NewIPOAdminPage() {
  return (
    <>
      <AdminPageHeader title="Add IPO" subtitle="Create a source-backed IPO master record. Emergency manual entry should support sync, not replace it." />
      <section className="admin-panel">
        <h2>IPO master details</h2>
        <div className="admin-form-grid">
          {fields.map((field) => (
            <label key={field}>
              <span>{field}</span>
              {field === "Notes" ? <textarea placeholder={field} /> : <input placeholder={field} />}
            </label>
          ))}
        </div>
        <div className="admin-warning-note">
          Save actions are available through the protected `/api/admin/ipos` route. Keep official source URLs attached to every manual IPO record.
        </div>
      </section>
    </>
  );
}
