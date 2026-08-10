import { NextResponse } from "next/server";
import { getAdminOrResponse, readJsonBody } from "@/lib/admin/api";
import { logAdminAction } from "@/lib/admin/audit";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await getAdminOrResponse(request, ["manage_settings"]);
  if (admin instanceof Response) return admin;

  const { data, error } = await supabaseAdmin.from("admin_settings").select("*").order("key");
  if (error) return NextResponse.json({ error: "Unable to load settings." }, { status: 500 });
  return NextResponse.json({
    environment: {
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
      emailProviderConfigured: Boolean(process.env.EMAIL_PROVIDER),
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      supabaseConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    settings: data ?? [],
  });
}

export async function PATCH(request: Request) {
  const admin = await getAdminOrResponse(request, ["manage_settings"]);
  if (admin instanceof Response) return admin;

  const body = await readJsonBody<{ key?: string; value?: unknown }>(request, {});
  if (!body.key) return NextResponse.json({ error: "key is required." }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("admin_settings")
    .upsert({ key: body.key, updated_at: new Date().toISOString(), updated_by: admin.userId === "local-dev-admin" ? null : admin.userId, value: body.value ?? null })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "Unable to update setting." }, { status: 500 });
  await logAdminAction({ action: "SETTINGS_UPDATED", admin, entityId: body.key, entityType: "admin_setting", newValue: data });
  return NextResponse.json({ message: "Setting updated.", setting: data });
}
