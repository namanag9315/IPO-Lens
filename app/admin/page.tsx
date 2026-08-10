import { AlertTriangle, Bot, CalendarClock, CheckCircle2, Database, RefreshCcw } from "lucide-react";
import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { formatDateTime, timeAgo } from "@/lib/admin/format";
import { safeCount, safeRows } from "@/lib/admin/safeQuery";
import { getDataFreshness } from "@/lib/ipo-data/dataFreshness";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type IPOStatusRow = { id: string; open_date: string | null; close_date: string | null; listing_date: string | null; status: string };
type SnapshotRow = { ipo_id: string | null; captured_at: string | null };
type SyncRow = Record<string, unknown>;
type ProviderRow = Record<string, unknown>;

function todayIso(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  return date.toISOString().slice(0, 10);
}

async function getOverviewData() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const [ipos, gmpSnapshots, subscriptionSnapshots, syncLogs, providers, aiCount, allotmentChecksToday, notificationsToday] = await Promise.all([
    safeRows<IPOStatusRow>(
      supabaseAdmin
        .from("ipos")
        .select("id, open_date, close_date, listing_date, status")
        .or("is_duplicate.is.null,is_duplicate.eq.false")
        .order("close_date", { ascending: true }),
    ),
    safeRows<SnapshotRow>(supabaseAdmin.from("ipo_gmp_snapshots").select("ipo_id, captured_at").order("captured_at", { ascending: false }).limit(500)),
    safeRows<SnapshotRow>(
      supabaseAdmin.from("ipo_subscription_snapshots").select("ipo_id, captured_at").order("captured_at", { ascending: false }).limit(500),
    ),
    safeRows<SyncRow>(supabaseAdmin.from("ipo_sync_runs_clean").select("*").order("started_at", { ascending: false }).limit(8)),
    safeRows<ProviderRow>(supabaseAdmin.from("ipo_data_providers").select("*").order("priority", { ascending: true }).limit(8)),
    safeCount(supabaseAdmin.from("ai_analysis").select("id", { count: "exact", head: true })),
    safeCount(supabaseAdmin.from("ipo_allotment_check_logs").select("id", { count: "exact", head: true }).gte("checked_at", `${todayIso()}T00:00:00.000Z`)),
    safeCount(supabaseAdmin.from("user_notifications").select("id", { count: "exact", head: true }).gte("created_at", `${todayIso()}T00:00:00.000Z`)),
  ]);

  const ipoIds = new Set(ipos.map((ipo) => ipo.id));
  const gmpIds = new Set(gmpSnapshots.map((row) => row.ipo_id).filter(Boolean));
  const subscriptionIds = new Set(subscriptionSnapshots.map((row) => row.ipo_id).filter(Boolean));
  const latestGmp = gmpSnapshots[0]?.captured_at ?? null;
  const latestSubscription = subscriptionSnapshots[0]?.captured_at ?? null;

  return {
    aiPending: Math.max(0, ipos.length - aiCount),
    allotmentChecksToday,
    closingToday: ipos.filter((ipo) => ipo.close_date === todayIso()).length,
    dataFresh: [latestGmp, latestSubscription].filter((date) => getDataFreshness(date) === "Fresh" || getDataFreshness(date) === "Recent").length,
    dataStale: [latestGmp, latestSubscription].filter((date) => getDataFreshness(date) === "Stale" || getDataFreshness(date) === "Old").length,
    failedSyncsToday: syncLogs.filter((log) => String(log.status).toLowerCase() === "failed" && String(log.started_at).startsWith(todayIso())).length,
    ipos,
    latestGmp,
    latestSubscription,
    listedIPOs: ipos.filter((ipo) => ipo.status === "listed").length,
    missingGmp: Array.from(ipoIds).filter((id) => !gmpIds.has(id)).length,
    missingSubscription: Array.from(ipoIds).filter((id) => !subscriptionIds.has(id)).length,
    notificationsToday,
    openIPOs: ipos.filter((ipo) => ipo.status === "open").length,
    openingToday: ipos.filter((ipo) => ipo.open_date === todayIso()).length,
    providers,
    syncLogs,
    totalIPOs: ipos.length,
    upcomingIPOs: ipos.filter((ipo) => ipo.status === "upcoming").length,
  };
}

export default async function AdminDashboardPage() {
  const data = await getOverviewData();

  if (!data) {
    return (
      <>
        <AdminPageHeader title="Admin Dashboard" subtitle="Configure Supabase environment variables to enable live admin operations." />
        <div className="admin-warning-note">Supabase is not configured. Admin UI is available, but live records cannot be loaded yet.</div>
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Operations Dashboard"
        subtitle="Monitor IPO data coverage, public-source sync health, allotment checks, AI summaries and platform notifications from one console."
        actions={<AdminActionButton endpoint="/api/admin/ipo-engine/full" label="Run full public sync" />}
      />

      <section className="admin-grid admin-grid-4">
        <AdminStatCard helper="Master records" icon={<Database size={18} />} label="Total IPOs" value={data.totalIPOs} />
        <AdminStatCard helper="Currently accepting bids" icon={<CheckCircle2 size={18} />} label="Open IPOs" tone="green" value={data.openIPOs} />
        <AdminStatCard helper="Need public GMP snapshots" icon={<AlertTriangle size={18} />} label="Missing GMP" tone="amber" value={data.missingGmp} />
        <AdminStatCard helper="Need subscription snapshots" icon={<AlertTriangle size={18} />} label="Missing Subs." tone="amber" value={data.missingSubscription} />
        <AdminStatCard helper="Fresh or recent source data" icon={<RefreshCcw size={18} />} label="Fresh Data" tone="green" value={data.dataFresh} />
        <AdminStatCard helper="Stale or old sources" icon={<AlertTriangle size={18} />} label="Stale Data" tone="red" value={data.dataStale} />
        <AdminStatCard helper="No generated analysis" icon={<Bot size={18} />} label="AI Pending" tone="blue" value={data.aiPending} />
        <AdminStatCard helper="Manual and saved checks" icon={<CalendarClock size={18} />} label="Allotment Checks" value={data.allotmentChecksToday} />
      </section>

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Today&apos;s IPO Operations</h2>
          <div className="admin-grid admin-grid-2">
            <AdminStatCard label="Opening today" value={data.openingToday} />
            <AdminStatCard label="Closing today" tone="amber" value={data.closingToday} />
            <AdminStatCard label="Notifications today" tone="blue" value={data.notificationsToday} />
            <AdminStatCard label="Failed syncs today" tone={data.failedSyncsToday ? "red" : "green"} value={data.failedSyncsToday} />
          </div>
        </div>

        <div className="admin-panel">
          <h2>Data Freshness</h2>
          <div className="admin-grid admin-grid-2">
            <AdminStatCard helper={timeAgo(data.latestGmp)} label="Latest GMP" tone="blue" value={getDataFreshness(data.latestGmp)} />
            <AdminStatCard helper={timeAgo(data.latestSubscription)} label="Latest Subscription" tone="blue" value={getDataFreshness(data.latestSubscription)} />
          </div>
          <p>Freshness is based on public-reference snapshot timestamps. Stale data should trigger a sync before analysis review.</p>
        </div>
      </section>

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Recent Sync Runs</h2>
          <AdminDataTable<SyncRow>
            columns={[
              { key: "started_at", label: "Date", render: (row) => formatDateTime(row.started_at) },
              { key: "provider", label: "Provider" },
              { key: "sync_type", label: "Type" },
              { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{String(row.status ?? "Missing")}</AdminStatusBadge> },
              { key: "saved", label: "Saved" },
            ]}
            rows={data.syncLogs}
          />
        </div>

        <div className="admin-panel">
          <h2>Provider Health</h2>
          <AdminDataTable<ProviderRow>
            columns={[
              { key: "provider_name", label: "Provider" },
              { key: "provider_type", label: "Type" },
              { key: "is_enabled", label: "Enabled", render: (row) => <AdminStatusBadge>{row.is_enabled ? "Enabled" : "Disabled"}</AdminStatusBadge> },
              { key: "last_success_at", label: "Last Success", render: (row) => timeAgo(row.last_success_at) },
            ]}
            rows={data.providers}
          />
        </div>
      </section>

      <section className="admin-panel">
        <h2>Quick Actions</h2>
        <div className="admin-filter-bar">
          <AdminActionButton endpoint="/api/admin/ipo-engine/gmp" label="Run GMP sync" />
          <AdminActionButton endpoint="/api/admin/ipo-engine/subscription" label="Run subscription sync" />
          <AdminActionButton endpoint="/api/admin/sync/ai-summaries" label="Generate missing AI" body={{ limit: 10 }} />
          <AdminActionButton endpoint="/api/admin/sync/notifications" label="Generate notifications" />
        </div>
      </section>
    </>
  );
}
