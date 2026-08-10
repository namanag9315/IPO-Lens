import { supabaseAdmin } from "@/lib/supabase";
import type { AdminContext } from "@/lib/admin/auth";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const SENSITIVE_KEY_PATTERN = /(pan|secret|token|password|authorization|api[_-]?key|service[_-]?role|encrypted|hash|application[_-]?number|demat)/i;

function scrub(value: unknown): JsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map(scrub);

  if (typeof value === "object") {
    const result: Record<string, JsonValue> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : scrub(nested);
    }
    return result;
  }

  return String(value);
}

export async function logAdminAction(input: {
  action: string;
  admin: AdminContext;
  entityId?: string | null;
  entityType?: string | null;
  metadata?: unknown;
  newValue?: unknown;
  oldValue?: unknown;
}) {
  try {
    await supabaseAdmin.from("admin_audit_logs").insert({
      action: input.action,
      entity_id: input.entityId ?? null,
      entity_type: input.entityType ?? null,
      metadata: scrub(input.metadata ?? null),
      new_value: scrub(input.newValue ?? null),
      old_value: scrub(input.oldValue ?? null),
      user_id: input.admin.userId === "local-dev-admin" ? null : input.admin.userId,
    });
  } catch {
    // Audit logs must never leak sensitive values or break the primary admin action.
  }
}
