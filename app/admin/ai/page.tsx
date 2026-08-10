import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type AIRow = Record<string, unknown> & { ipo?: { name?: string | null } | null };
type MissingRow = Record<string, unknown>;

export default async function AdminAIPage() {
  const [summaries, ipos] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<AIRow>(supabaseAdmin.from("ai_analysis").select("*, ipo:ipos(name)").order("generated_at", { ascending: false }).limit(80)),
        safeRows<MissingRow>(
          supabaseAdmin.from("ipos").select("id, name, status").or("is_duplicate.is.null,is_duplicate.eq.false").order("close_date", { ascending: false }).limit(120),
        ),
      ])
    : [[], []];
  const generatedIds = new Set(summaries.map((row) => String(row.ipo_id)));
  const missing = ipos.filter((ipo) => !generatedIds.has(String(ipo.id)));

  return (
    <>
      <AdminPageHeader
        title="AI Summary Management"
        subtitle="Generate and review structured IPO research memos. AI explains rule-based scores but never calculates scores or gives investment advice."
        actions={<AdminActionButton endpoint="/api/admin/ai/generate-missing" label="Generate missing summaries" body={{ limit: 10 }} />}
      />

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Missing summaries</h2>
          <AdminDataTable<MissingRow>
            columns={[
              { key: "name", label: "IPO" },
              { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
              { key: "action", label: "Generate", render: (row) => <AdminActionButton endpoint="/api/admin/ai/generate" label="Generate" body={{ ipoId: row.id }} /> },
            ]}
            rows={missing.slice(0, 20)}
          />
        </div>
        <div className="admin-panel">
          <h2>Safety rules</h2>
          <p>AI output must use educational language, avoid apply/avoid/buy/sell instructions, avoid guaranteed listing gains, and never include full PAN or identifiers.</p>
          <AdminStatusBadge>Needs Review</AdminStatusBadge>
        </div>
      </section>

      <section className="admin-panel">
        <h2>Latest generated summaries</h2>
        <AdminDataTable<AIRow>
          columns={[
            { key: "ipo", label: "IPO", render: (row) => row.ipo?.name ?? "Unknown IPO" },
            { key: "score", label: "Score" },
            { key: "label", label: "Signal", render: (row) => <AdminStatusBadge>{asString(row.label, "Generated")}</AdminStatusBadge> },
            { key: "generated_at", label: "Generated", render: (row) => formatDateTime(row.generated_at) },
            { key: "status", label: "Review", render: () => <AdminStatusBadge>Generated</AdminStatusBadge> },
          ]}
          rows={summaries}
        />
      </section>
    </>
  );
}
