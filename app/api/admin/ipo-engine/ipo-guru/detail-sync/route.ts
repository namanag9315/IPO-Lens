import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await requireAdminApi(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  try {
    const body = (await request.json().catch(() => ({}))) as { ipoId?: string };
    const { runIPOGuruDetailSync } = await import("@/lib/ipo-engine-clean/sync/runIPOGuruDetailSync");
    const result = await runIPOGuruDetailSync(body.ipoId);
    return NextResponse.json({ ok: result.success, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Detail sync failed" },
      { status: 500 }
    );
  }
}
