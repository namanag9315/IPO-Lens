import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <main className="section">
      <div className="shell">
        <div className="premium-card notification-page-card">
          <Bell size={24} />
          <h1>Notifications</h1>
          <p>
            Sign in to view IPO opening, closing, allotment, listing, GMP, subscription and AI analysis notifications. IPO Lens notifications are
            educational research alerts and do not include investment advice.
          </p>
        </div>
      </div>
    </main>
  );
}
