import AdminActionButton from "@/components/admin/AdminActionButton";
import AdminDataTable from "@/components/admin/AdminDataTable";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { asString, formatDateTime } from "@/lib/admin/format";
import { safeRows } from "@/lib/admin/safeQuery";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type EventRow = Record<string, unknown> & { ipo?: { name?: string | null } | null };
type DeliveryRow = Record<string, unknown>;

export default async function AdminNotificationsPage() {
  const [events, deliveries] = isSupabaseConfigured()
    ? await Promise.all([
        safeRows<EventRow>(supabaseAdmin.from("notification_events").select("*, ipo:ipos(name)").order("created_at", { ascending: false }).limit(80)),
        safeRows<DeliveryRow>(supabaseAdmin.from("notification_delivery_logs").select("*").order("created_at", { ascending: false }).limit(80)),
      ])
    : [[], []];

  return (
    <>
      <AdminPageHeader
        title="Notification Admin"
        subtitle="Review generated notification events and email delivery outcomes. Notifications must not include PAN, application numbers or advice language."
        actions={<AdminActionButton endpoint="/api/admin/notifications/generate" label="Generate notifications now" />}
      />

      <section className="admin-grid admin-grid-4">
        <AdminStatCard label="Events generated" value={events.length} />
        <AdminStatCard label="Email sent" tone="green" value={deliveries.filter((row) => row.status === "SENT").length} />
        <AdminStatCard label="Email skipped" tone="amber" value={deliveries.filter((row) => row.status === "SKIPPED").length} />
        <AdminStatCard label="Email failed" tone="red" value={deliveries.filter((row) => row.status === "FAILED").length} />
      </section>

      <section className="admin-grid admin-grid-2">
        <div className="admin-panel">
          <h2>Latest events</h2>
          <AdminDataTable<EventRow>
            columns={[
              { key: "event_type", label: "Event", render: (row) => <AdminStatusBadge>{asString(row.event_type)}</AdminStatusBadge> },
              { key: "ipo", label: "IPO", render: (row) => row.ipo?.name ?? "NA" },
              { key: "title", label: "Title" },
              { key: "created_at", label: "Created", render: (row) => formatDateTime(row.created_at) },
            ]}
            rows={events}
          />
        </div>
        <div className="admin-panel">
          <h2>Delivery logs</h2>
          <AdminDataTable<DeliveryRow>
            columns={[
              { key: "channel", label: "Channel" },
              { key: "status", label: "Status", render: (row) => <AdminStatusBadge>{asString(row.status)}</AdminStatusBadge> },
              { key: "provider", label: "Provider" },
              { key: "error_message", label: "Error", render: (row) => asString(row.error_message, "-") },
              { key: "created_at", label: "Created", render: (row) => formatDateTime(row.created_at) },
            ]}
            rows={deliveries}
          />
        </div>
      </section>
    </>
  );
}
