import { NextResponse } from "next/server";
import { getAdminOrResponse, readJsonBody } from "@/lib/admin/api";
import { logAdminAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getAdminOrResponse(request, ["manage_ai"]);
  if (admin instanceof Response) return admin;

  const body = await readJsonBody<{ ipoId?: string }>(request, {});
  if (!body.ipoId) return NextResponse.json({ error: "ipoId is required." }, { status: 400 });

  const response = await fetch(new URL("/api/generate-analysis", request.url), {
    body: JSON.stringify({ ipoId: body.ipoId }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return NextResponse.json({ error: result.error ?? "AI generation failed." }, { status: response.status });

  await logAdminAction({ action: "AI_SUMMARY_GENERATED", admin, entityId: body.ipoId, entityType: "ipo", metadata: { cached: result.cached } });
  return NextResponse.json({ ...result, message: result.cached ? "AI summary is already fresh." : "AI summary generated." });
}
