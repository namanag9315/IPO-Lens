"use client";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationDropdownProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}

export default function NotificationDropdown({ notifications, onMarkAllRead }: NotificationDropdownProps) {
  return (
    <div className="notification-dropdown">
      <div className="notification-dropdown-head">
        <strong>Notifications</strong>
        <button onClick={onMarkAllRead} type="button">
          Mark all read
        </button>
      </div>
      <div className="notification-list">
        {notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          notifications.slice(0, 6).map((notification) => (
            <a className={notification.is_read ? "" : "unread"} href={notification.cta_url ?? "/notifications"} key={notification.id}>
              <strong>{notification.title}</strong>
              <span>{notification.message}</span>
              <small>{new Date(notification.created_at).toLocaleString("en-IN")}</small>
            </a>
          ))
        )}
      </div>
      <a className="notification-view-all" href="/notifications">
        View all notifications
      </a>
    </div>
  );
}
