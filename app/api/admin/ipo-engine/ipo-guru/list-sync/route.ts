import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireAdminApi(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  try {
    const { runIPOGuruListSync } = await import("@/lib/ipo-engine-clean/sync/runIPOGuruListSync");
    const result = await runIPOGuruListSync();
    return NextResponse.json({ ok: result.success, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "List sync failed" },
      { status: 500 }
    );
  }
}
