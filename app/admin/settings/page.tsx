import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";

const envRows = [
  ["Supabase URL", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)],
  ["Supabase service role", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)],
  ["Groq API key", Boolean(process.env.GROQ_API_KEY)],
  ["CRON_SECRET", Boolean(process.env.CRON_SECRET)],
  ["Email provider", Boolean(process.env.EMAIL_PROVIDER)],
  ["Resend API key", Boolean(process.env.RESEND_API_KEY)],
] as const;

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader title="System Settings" subtitle="Review environment readiness and operational settings without exposing secret values." />

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Environment status</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <tbody>
                {envRows.map(([label, configured]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td><AdminStatusBadge>{configured ? "Configured" : "Missing"}</AdminStatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="admin-panel">
          <h2>Data disclaimers</h2>
          <div className="admin-form-grid">
            {["GMP disclaimer", "Subscription disclaimer", "AI disclaimer", "Allotment probability disclaimer"].map((field) => (
              <label key={field}>
                <span>{field}</span>
                <textarea placeholder={field} />
              </label>
            ))}
          </div>
        </div>
      </section>

      <section className="admin-grid admin-grid-3">
        {["GMP sync enabled", "Subscription sync enabled", "Auto-generate AI summaries", "Require AI approval", "In-app notifications", "Weekly digest"].map((setting) => (
          <div className="admin-panel" key={setting}>
            <h3>{setting}</h3>
            <AdminStatusBadge>Configured</AdminStatusBadge>
          </div>
        ))}
      </section>
    </>
  );
}
