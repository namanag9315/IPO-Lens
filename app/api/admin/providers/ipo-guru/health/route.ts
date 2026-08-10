import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
// Import from the health checker (that file may not exist yet - build defensively)

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleHealthCheck(request: Request) {
  const admin = await requireAdminApi(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  try {
    // Dynamic import to avoid build-time errors if ipoGuruHealth.ts is not yet compiled
    const { checkIPOGuruHealth } = await import("@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruHealth");
    const result = await checkIPOGuruHealth();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      configured: false,
      enabled: false,
      ok: false,
      status: null,
      error: err instanceof Error ? err.message : "Health check failed",
      keyPreview: null,
      durationMs: 0,
    });
  }
}

export async function GET(request: Request) {
  return handleHealthCheck(request);
}

// AdminActionButton only supports POST/PATCH/DELETE — expose POST alias for the UI button
export async function POST(request: Request) {
  return handleHealthCheck(request);
}
