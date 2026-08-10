import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { supabaseAdmin } from "@/lib/supabase";
import { AlertTriangle, Ban, Copy, SearchX } from "lucide-react";

export const dynamic = "force-dynamic";

type AdminRow = Record<string, unknown>;

async function safeCount(table: string, column: string, value: string | boolean): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin.from(table).select("*", { count: "exact", head: true }).eq(column, value);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function DataHealthPage() {
  const [duplicateCount, needsReviewCount, ignoredCount, failedRunsCount, reviewRows, failedRuns] = await Promise.all([
    safeCount("ipos", "is_duplicate", true),
    safeCount("ipo_source_records_clean", "status", "needs_review"),
    safeCount("ipo_source_records_clean", "status", "ignored"),
    safeCount("ipo_sync_runs_clean", "status", "failed"),
    safeRows<AdminRow>(
      supabaseAdmin
        .from("ipo_source_records_clean")
        .select("*")
        .in("status", ["needs_review", "ignored", "rejected"])
        .order("created_at", { ascending: false })
        .limit(80),
    ),
    safeRows<AdminRow>(supabaseAdmin.from("ipo_sync_runs_clean").select("*").eq("status", "failed").order("started_at", { ascending: false }).limit(20)),
  ]);

  return (
    <>
      <AdminPageHeader title="Data Health" subtitle="Clean-engine review queue for duplicate candidates, unmatched source records and failed sync runs." />

      <section className="admin-grid admin-grid-4">
        <AdminStatCard icon={<Copy size={20} />} label="Merged duplicates" tone={duplicateCount ? "amber" : "green"} value={duplicateCount} />
        <AdminStatCard icon={<AlertTriangle size={20} />} label="Needs review" tone={needsReviewCount ? "amber" : "green"} value={needsReviewCount} />
        <AdminStatCard icon={<SearchX size={20} />} label="Ignored/unmatched" tone={ignoredCount ? "amber" : "green"} value={ignoredCount} />
        <AdminStatCard icon={<Ban size={20} />} label="Failed syncs" tone={failedRunsCount ? "red" : "green"} value={failedRunsCount} />
      </section>

      <section className="admin-panel">
        <h2>Source Records Requiring Review</h2>
        <AdminDataTable<AdminRow>
          columns={[
            { key: "created_at", label: "Created", render: (row) => formatDateTime(row.created_at) },
            { key: "provider", label: "Provider" },
            { key: "record_type", label: "Type" },
            { key: "raw_name", label: "Raw name" },
            { key: "match_confidence", label: "Confidence" },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
            { key: "reason", label: "Reason", render: (row) => asString(row.reason, "No reason saved") },
          ]}
          emptyMessage="No clean source records require review."
          rows={reviewRows}
        />
      </section>

      <section className="admin-panel">
        <h2>Failed Clean Sync Runs</h2>
        <AdminDataTable<AdminRow>
          columns={[
            { key: "started_at", label: "Started", render: (row) => formatDateTime(row.started_at) },
            { key: "sync_type", label: "Type" },
            { key: "provider", label: "Provider" },
            { key: "errors", label: "Errors", render: (row) => (Array.isArray(row.errors) ? row.errors.join("; ") : "No error saved") },
          ]}
          emptyMessage="No failed clean sync runs."
          rows={failedRuns}
        />
      </section>
    </>
  );
}
