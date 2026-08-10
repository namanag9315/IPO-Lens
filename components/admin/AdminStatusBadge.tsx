const BADGE_STYLE: Record<string, string> = {
  approved: "admin-badge admin-badge-green",
  auto_applied: "admin-badge admin-badge-green",
  fresh: "admin-badge admin-badge-green",
  high: "admin-badge admin-badge-green",
  open: "admin-badge admin-badge-green",
  published: "admin-badge admin-badge-green",
  success: "admin-badge admin-badge-green",
  synced: "admin-badge admin-badge-green",
  configured: "admin-badge admin-badge-green",
  recent: "admin-badge admin-badge-blue",
  generated: "admin-badge admin-badge-blue",
  listed: "admin-badge admin-badge-blue",
  running: "admin-badge admin-badge-blue",
  medium: "admin-badge admin-badge-blue",
  closed: "admin-badge admin-badge-slate",
  draft: "admin-badge admin-badge-slate",
  missing: "admin-badge admin-badge-slate",
  old: "admin-badge admin-badge-slate",
  skipped: "admin-badge admin-badge-slate",
  unavailable: "admin-badge admin-badge-slate",
  viewer: "admin-badge admin-badge-slate",
  stale: "admin-badge admin-badge-amber",
  partial: "admin-badge admin-badge-amber",
  partial_success: "admin-badge admin-badge-amber",
  upcoming: "admin-badge admin-badge-amber",
  pending: "admin-badge admin-badge-amber",
  editor: "admin-badge admin-badge-amber",
  failed: "admin-badge admin-badge-red",
  error: "admin-badge admin-badge-red",
  low: "admin-badge admin-badge-red",
  needs_review: "admin-badge admin-badge-red",
  admin: "admin-badge admin-badge-blue",
  owner: "admin-badge admin-badge-green",
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "_");
}

export default function AdminStatusBadge({ children, tone }: { children: string; tone?: string }) {
  const key = normalize(tone ?? children);
  return <span className={BADGE_STYLE[key] ?? "admin-badge admin-badge-slate"}>{children}</span>;
}
