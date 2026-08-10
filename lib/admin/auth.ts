import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { hasEveryAdminPermission, isAdminRole, type AdminPermission, type AdminRole } from "@/lib/admin/permissions";

interface AdminUserRow {
  email: string;
  id: string;
  is_active: boolean | null;
  role: string | null;
  user_id: string;
}

export interface AdminContext {
  email: string;
  name: string;
  role: AdminRole;
  userId: string;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : null;
}

function tryJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function decodeMaybeBase64(value: string) {
  const decoded = decodeURIComponent(value);

  if (!decoded.startsWith("base64-")) {
    return decoded;
  }

  try {
    return Buffer.from(decoded.slice("base64-".length), "base64").toString("utf8");
  } catch {
    return decoded;
  }
}

function tokenFromCookieValue(rawValue: string) {
  const value = decodeMaybeBase64(rawValue);
  const parsed = tryJsonParse(value);

  if (Array.isArray(parsed) && typeof parsed[0] === "string") {
    return parsed[0];
  }

  if (parsed && typeof parsed === "object" && "access_token" in parsed && typeof parsed.access_token === "string") {
    return parsed.access_token;
  }

  if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value)) {
    return value;
  }

  return null;
}

function tokenFromCookies() {
  const cookieStore = cookies();

  const directToken = cookieStore.get("sb-access-token")?.value ?? cookieStore.get("supabase-auth-token")?.value;
  if (directToken) {
    const token = tokenFromCookieValue(directToken);
    if (token) return token;
  }

  for (const cookie of cookieStore.getAll()) {
    if (!cookie.name.startsWith("sb-") || !cookie.name.endsWith("-auth-token")) {
      continue;
    }

    const token = tokenFromCookieValue(cookie.value);
    if (token) return token;
  }

  return null;
}

async function userFromToken(token: string | null): Promise<User | null> {
  if (!token || !isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

function adminFromEnv(user: User): AdminContext | null {
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const email = user.email?.toLowerCase();

  if (!email || !allowedEmails.includes(email)) {
    return null;
  }

  return {
    email,
    name: user.user_metadata?.name ?? email,
    role: "owner",
    userId: user.id,
  };
}

function localDevAdmin(): AdminContext | null {
  if (process.env.NODE_ENV === "production" || !process.env.ADMIN_DEV_EMAIL) {
    return null;
  }

  return {
    email: process.env.ADMIN_DEV_EMAIL,
    name: "Local Admin",
    role: "owner",
    userId: "local-dev-admin",
  };
}

async function lookupAdmin(user: User): Promise<AdminContext | null> {
  if (!isSupabaseConfigured()) {
    return adminFromEnv(user);
  }

  const email = user.email?.toLowerCase() ?? "";
  const { data, error } = await supabaseAdmin
    .from("admin_users")
    .select("id, user_id, email, role, is_active")
    .or(`user_id.eq.${user.id},email.eq.${email}`)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    return adminFromEnv(user);
  }

  const row = data as AdminUserRow | null;
  const role = isAdminRole(row?.role) ? row.role : null;

  if (!row || !role) {
    return adminFromEnv(user);
  }

  return {
    email: row.email || email,
    name: user.user_metadata?.name ?? row.email ?? email,
    role,
    userId: row.user_id,
  };
}

export async function getCurrentAdmin(request?: Request): Promise<AdminContext | null> {
  const token = request ? bearerToken(request) : tokenFromCookies();
  const user = await userFromToken(token);

  if (user) {
    return lookupAdmin(user);
  }

  return localDevAdmin();
}

export async function requireAdminPage(permissions: AdminPermission[] = ["view_admin"]) {
  const admin = await getCurrentAdmin();

  if (!admin || !hasEveryAdminPermission(admin.role, permissions)) {
    redirect("/unauthorized");
  }

  return admin;
}

export async function requireAdminApi(request: Request, permissions: AdminPermission[] = ["view_admin"]) {
  const admin = await getCurrentAdmin(request);

  if (!admin) {
    return NextResponse.json({ error: "Admin authentication is required." }, { status: 401 });
  }

  if (!hasEveryAdminPermission(admin.role, permissions)) {
    return NextResponse.json({ error: "Admin permission is required." }, { status: 403 });
  }

  return admin;
}
