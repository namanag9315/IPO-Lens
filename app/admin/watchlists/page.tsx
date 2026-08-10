import Link from "next/link";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatMoney } from "@/lib/admin/format";
import { getComputedIPOs } from "@/lib/ipoData";

export const dynamic = "force-dynamic";

export default async function AdminWatchlistsPage() {
  const ipos = await getComputedIPOs();
  const derivedWatchlist = ipos
    .filter((ipo) => ipo.status === "open" || ipo.status === "upcoming" || (ipo.latest_gmp_percent ?? 0) > 0 || (ipo.latest_subscription?.total_x ?? 0) >= 1)
    .slice(0, 80);

  return (
    <>
      <AdminPageHeader title="Watchlists" subtitle="Current watchlist data is derived from IPO state and demand signals. Add a persistent user watchlist table when account-level tracking is enabled." />
      <div className="admin-warning-note">
        No persistent user watchlist table was found in the current schema, so this page shows the same research watchlist logic used by the public dashboard.
      </div>
      <section className="admin-panel">
        <AdminDataTable
          columns={[
            { key: "name", label: "IPO", render: (row) => <Link className="admin-table-link" href={`/ipo/${asString(row.slug)}`}>{asString(row.name)}</Link> },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
            { key: "category", label: "Type", render: (row) => asString(row.category) },
            { key: "latest_gmp", label: "GMP", render: (row) => formatMoney(row.latest_gmp) },
            { key: "latest_gmp_percent", label: "GMP %", render: (row) => (typeof row.latest_gmp_percent === "number" ? `${row.latest_gmp_percent.toFixed(1)}%` : "NA") },
          ]}
          rows={derivedWatchlist as unknown as Array<Record<string, unknown>>}
        />
      </section>
    </>
  );
}
