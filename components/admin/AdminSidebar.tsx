"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  ClipboardCheck,
  Database,
  Gauge,
  LayoutDashboard,
  LineChart,
  ListChecks,
  LockKeyhole,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

const groups = [
  {
    label: "Overview",
    links: [{ href: "/admin", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "IPO Data",
    links: [
      { href: "/admin/ipos", icon: Database, label: "IPOs" },
      { href: "/admin/gmp", icon: LineChart, label: "GMP" },
      { href: "/admin/subscription", icon: ListChecks, label: "Subscription" },
      { href: "/admin/lead-managers", icon: ShieldCheck, label: "Lead Managers" },
      { href: "/admin/market-makers", icon: Gauge, label: "Market Makers" },
    ],
  },
  {
    label: "Operations",
    links: [
      { href: "/admin/sync", icon: RefreshCcw, label: "Sync Center" },
      { href: "/admin/data-engine", icon: RefreshCcw, label: "Data Engine" },
      { href: "/admin/providers", icon: Gauge, label: "Providers" },
      { href: "/admin/allotment", icon: ClipboardCheck, label: "Allotment Logs" },
      { href: "/admin/notifications", icon: Bell, label: "Notifications" },
      { href: "/admin/data-health", icon: AlertTriangle, label: "Data Health" },
    ],
  },
  {
    label: "Users",
    links: [
      { href: "/admin/users", icon: Users, label: "User Profiles" },
      { href: "/admin/watchlists", icon: ListChecks, label: "Watchlists" },
      { href: "/admin/saved-pan-safety", icon: LockKeyhole, label: "Saved PAN Safety" },
    ],
  },
  {
    label: "Content",
    links: [{ href: "/admin/content/ipo-guide", icon: BookOpen, label: "IPO Guide" }],
  },
  {
    label: "System",
    links: [
      { href: "/admin/settings", icon: Settings, label: "Settings" },
      { href: "/admin/audit-logs", icon: ShieldCheck, label: "Audit Logs" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar">
      <Link className="admin-sidebar-brand" href="/admin">
        <span>IPO</span>
        <div>
          <strong>IPO Lens</strong>
          <small>Operations Console</small>
        </div>
      </Link>

      <nav>
        {groups.map((group) => (
          <section key={group.label}>
            <p>{group.label}</p>
            {group.links.map((link) => {
              const Icon = link.icon;
              return (
                <Link className={isActive(pathname, link.href) ? "active" : ""} href={link.href} key={link.href}>
                  <Icon size={16} />
                  {link.label}
                </Link>
              );
            })}
          </section>
        ))}
      </nav>

      <div className="admin-sidebar-note">
        <LockKeyhole size={16} />
        <span>No secrets or full PAN values are shown in admin views.</span>
      </div>
    </aside>
  );
}
