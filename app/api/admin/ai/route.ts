import { NextResponse } from "next/server";
import { getAdminOrResponse } from "@/lib/admin/api";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const admin = await getAdminOrResponse(request);
  if (admin instanceof Response) return admin;

  const { data, error } = await supabaseAdmin.from("ai_analysis").select("*, ipo:ipos(name)").order("generated_at", { ascending: false }).limit(150);
  if (error) return NextResponse.json({ error: "Unable to load AI summaries." }, { status: 500 });
  return NextResponse.json({ summaries: data ?? [] });
}
