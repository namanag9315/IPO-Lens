import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import UnmatchedActionButtons from "./UnmatchedActionButtons";

export const dynamic = "force-dynamic";

export default async function UnmatchedRecordsPage() {
  const [records, ipos] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<any>(
          supabaseAdmin
            .from("ipo_unmatched_source_records")
            .select("*")
            .eq("status", "needs_review")
            .order("created_at", { ascending: false })
            .limit(100)
        ),
        safeRows<{ id: string; name: string }>(
          supabaseAdmin.from("ipos").select("id, name").or("is_duplicate.is.null,is_duplicate.eq.false").order("name", { ascending: true })
        ),
      ])
    : [[], []];

  return (
    <>
      <AdminPageHeader
        title="Unmatched Records Review"
        subtitle="Review records from providers with 70-84 match confidence. Link them to an existing IPO or ignore them."
      />

      <section className="admin-panel">
        <h2>Records Needing Review ({records.length})</h2>
        {records.length === 0 ? (
          <p className="admin-muted">No records currently need review.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {records.map((record) => (
              <div key={record.id} style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{asString(record.raw_name)}</strong>
                    <p className="admin-muted" style={{ margin: "4px 0" }}>
                      Provider: {asString(record.provider)} | Type: {asString(record.data_type)}
                    </p>
                    <p className="admin-muted" style={{ margin: "4px 0" }}>
                      Confidence: {record.confidence ? Number(record.confidence).toFixed(2) : "Unknown"}
                    </p>
                  </div>
                  <div>
                    <UnmatchedActionButtons
                      recordId={record.id}
                      suggestedIpoId={record.suggested_ipo_id as string | undefined}
                      ipos={ipos}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
