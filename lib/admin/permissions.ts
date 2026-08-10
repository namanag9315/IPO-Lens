export type AdminRole = "owner" | "admin" | "editor" | "viewer";

export type AdminPermission =
  | "view_admin"
  | "manage_ipo_data"
  | "run_syncs"
  | "manage_ai"
  | "manage_notifications"
  | "manage_users"
  | "manage_settings"
  | "view_audit_logs";

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  owner: [
    "view_admin",
    "manage_ipo_data",
    "run_syncs",
    "manage_ai",
    "manage_notifications",
    "manage_users",
    "manage_settings",
    "view_audit_logs",
  ],
  admin: ["view_admin", "manage_ipo_data", "run_syncs", "manage_ai", "manage_notifications", "manage_users", "view_audit_logs"],
  editor: ["view_admin", "manage_ipo_data", "manage_ai", "view_audit_logs"],
  viewer: ["view_admin", "view_audit_logs"],
};

export function isAdminRole(value: string | null | undefined): value is AdminRole {
  return value === "owner" || value === "admin" || value === "editor" || value === "viewer";
}

export function hasAdminPermission(role: AdminRole, permission: AdminPermission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasEveryAdminPermission(role: AdminRole, permissions: AdminPermission[]) {
  return permissions.every((permission) => hasAdminPermission(role, permission));
}
