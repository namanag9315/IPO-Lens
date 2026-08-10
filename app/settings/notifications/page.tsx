export default function NotificationSettingsPage() {
  return (
    <main className="section">
      <div className="shell">
        <div className="premium-card notification-page-card">
          <span className="allotment-card-label">Notification preferences</span>
          <h1>IPO alert settings</h1>
          <p>
            Preferences are available for signed-in users through the notification preferences API. Email alerts are optional and only sent when
            enabled. Alerts never include PAN, application number, demat ID, or investment advice.
          </p>
          <div className="notification-settings-grid">
            {[
              "IPO opening alerts",
              "IPO closing alerts",
              "Allotment alerts",
              "Listing alerts",
              "GMP movement alerts",
              "Subscription movement alerts",
              "Weekly digest",
              "Email enabled",
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
