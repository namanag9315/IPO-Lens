import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireAdminApi(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  try {
    const { runIPOGuruGMPSync } = await import("@/lib/ipo-engine-clean/sync/runIPOGuruGMPSync");
    const result = await runIPOGuruGMPSync();
    return NextResponse.json({ ok: result.success, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "GMP sync failed" },
      { status: 500 }
    );
  }
}
