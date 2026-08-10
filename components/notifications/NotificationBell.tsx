"use client";

import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import NotificationDropdown from "@/components/notifications/NotificationDropdown";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  cta_label: string | null;
  cta_url: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const unreadCount = notifications.filter((item) => !item.is_read).length;

  async function loadNotifications() {
    try {
      const response = await fetch("/api/notifications");

      if (response.status === 401) {
        setAvailable(false);
        return;
      }

      const payload = (await response.json()) as { notifications?: NotificationItem[] };
      setNotifications(payload.notifications ?? []);
      setAvailable(true);
    } catch {
      setAvailable(false);
    }
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
  }

  if (!available) {
    return null;
  }

  return (
    <div className="notification-bell-wrap">
      <button aria-label="Notifications" className="notification-bell" onClick={() => setOpen((value) => !value)} type="button">
        <Bell size={17} />
        {unreadCount > 0 ? <span>{unreadCount}</span> : null}
      </button>
      {open ? <NotificationDropdown notifications={notifications} onMarkAllRead={() => void markAllRead()} /> : null}
    </div>
  );
}
