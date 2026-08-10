/**
 * POST /api/admin/source-discovery
 * Runs source URL discovery for active/upcoming/recent IPOs.
 * Triggered manually via admin "Run Source Discovery" button.
 * Does NOT run cron — manual trigger only.
 */
import { NextResponse } from "next/server";
import { runSourceUrlDiscoveryClean } from "@/lib/ipo-engine-clean/sync/runSourceUrlDiscoveryClean";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  if (process.env.DISABLE_AUTO_SYNC === "true") {
    return NextResponse.json({ status: "SKIPPED", reason: "Kill switch active." });
  }

  const result = await runSourceUrlDiscoveryClean();

  return NextResponse.json({
    status: result.status,
    summary: {
      discovered: result.discovered,
      verified: result.verified,
      failed: result.failed,
      blocked: result.blocked,
      needs_review: result.needs_review,
    },
    ipoResults: result.ipoResults,
  });
}
