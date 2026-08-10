import Link from "next/link";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatCr, formatDate, formatMoney, formatPct, formatTimes, timeAgo } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type IPOAdminRow = Record<string, unknown> & {
  category: string | null;
  exchange: string | null;
  id: string;
  name: string;
  slug: string;
  status: string;
};

type SnapshotRow = Record<string, unknown> & {
  captured_at: string | null;
  gmp_pct?: number | null;
  gmp_value?: number | null;
  ipo_id: string | null;
  retail_x?: number | null;
  total_x?: number | null;
};

function latestByIPO<T extends { ipo_id: string | null; captured_at?: string | null }>(rows: T[]) {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (!row.ipo_id || map.has(row.ipo_id)) continue;
    map.set(row.ipo_id, row);
  }
  return map;
}

function factCoverage(facts: Array<{ ipo_id: string | null }>) {
  const map = new Map<string, number>();
  for (const fact of facts) {
    if (!fact.ipo_id) continue;
    map.set(fact.ipo_id, (map.get(fact.ipo_id) ?? 0) + 1);
  }
  return map;
}

export default async function AdminIPOsPage({ searchParams }: { searchParams?: { q?: string } }) {
  const search = searchParams?.q?.trim() ?? "";
  const baseQuery = supabaseAdmin
    .from("ipos")
    .select("*")
    .or("is_duplicate.is.null,is_duplicate.eq.false")
    .order("close_date", { ascending: false })
    .limit(150);

  const [ipos, gmpRows, subscriptionRows, facts] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<IPOAdminRow>(search ? baseQuery.ilike("name", `%${search}%`) : baseQuery),
        safeRows<SnapshotRow>(supabaseAdmin.from("ipo_gmp_history_clean").select("*").order("captured_at", { ascending: false }).limit(700)),
        safeRows<SnapshotRow>(supabaseAdmin.from("ipo_subscription_history_clean").select("*").order("captured_at", { ascending: false }).limit(700)),
        safeRows<{ ipo_id: string | null }>(supabaseAdmin.from("ipo_facts_clean").select("ipo_id").limit(3000)),
      ])
    : [[], [], [], []];

  const gmpByIPO = latestByIPO(gmpRows);
  const subscriptionByIPO = latestByIPO(subscriptionRows);
  const coverageByIPO = factCoverage(facts);

  return (
    <>
      <AdminPageHeader
        title="IPO Management"
        subtitle="Canonical IPO master records. Merged duplicates are hidden by default; clean facts and snapshots come from the reset engine."
        actions={
          <>
            <Link className="ui-button ui-button-primary" href="/admin/data-engine">
              Open Data Engine
            </Link>
            <Link className="ui-button ui-button-secondary" href="/admin/ipos/new">
              Add IPO
            </Link>
          </>
        }
      />

      <form className="admin-filter-bar">
        <input defaultValue={search} name="q" placeholder="Search canonical IPO name..." />
        <button className="ui-button ui-button-secondary" type="submit">
          Filter
        </button>
      </form>

      <section className="admin-panel">
        <AdminDataTable<IPOAdminRow>
          columns={[
            {
              key: "name",
              label: "IPO",
              render: (row) => (
                <div>
                  <Link className="admin-table-link" href={`/admin/ipos/${row.id}`}>
                    {row.name}
                  </Link>
                  <span className="admin-table-muted">
                    {row.category ?? "NA"} · {row.exchange ?? "NSE/BSE"}
                  </span>
                </div>
              ),
            },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{row.status}</AdminStatusBadge> },
            { key: "open_date", label: "Open", render: (row) => formatDate(row.open_date) },
            { key: "close_date", label: "Close", render: (row) => formatDate(row.close_date) },
            { key: "price_band_high", label: "Price", render: (row) => formatMoney(row.price_band_high) },
            { key: "issue_size_cr", label: "Issue Size", render: (row) => formatCr(row.issue_size_cr) },
            {
              key: "latest_gmp",
              label: "Clean GMP",
              render: (row) => {
                const snap = gmpByIPO.get(row.id);
                return (
                  <div>
                    <strong>{formatMoney(snap?.gmp_value ?? null)}</strong>
                    <span className="admin-table-muted">
                      {snap ? `${formatPct(snap.gmp_pct)} · ${timeAgo(snap.captured_at)}` : "Missing"}
                    </span>
                  </div>
                );
              },
            },
            {
              key: "retail",
              label: "Clean Subs.",
              render: (row) => {
                const snap = subscriptionByIPO.get(row.id);
                return (
                  <div>
                    <strong>{formatTimes(snap?.total_x ?? null)}</strong>
                    <span className="admin-table-muted">{snap ? `Retail ${formatTimes(snap.retail_x)} · ${timeAgo(snap.captured_at)}` : "Missing"}</span>
                  </div>
                );
              },
            },
            {
              key: "coverage",
              label: "Clean facts",
              render: (row) => {
                const count = coverageByIPO.get(row.id) ?? 0;
                return <AdminStatusBadge tone={count >= 8 ? "green" : count >= 3 ? "amber" : "red"}>{`${count} facts`}</AdminStatusBadge>;
              },
            },
            {
              key: "actions",
              label: "Actions",
              render: (row) => (
                <div className="admin-filter-bar">
                  <Link className="admin-table-link" href={`/ipo/${asString(row.slug)}`}>
                    Public
                  </Link>
                  <Link className="admin-table-link" href={`/admin/ipos/${row.id}`}>
                    Manage
                  </Link>
                </div>
              ),
            },
          ]}
          emptyMessage="No canonical IPOs found. Add an IPO or run the clean IPO list sync from Data Engine."
          rows={ipos}
        />
      </section>
    </>
  );
}
