// DISABLED: Old data engine caused duplicate/random IPO data. Replaced by IPO Data Engine Lite.
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (process.env.DISABLE_AUTO_SYNC === "true") {
    return NextResponse.json({ status: "SKIPPED", reason: "Auto sync disabled by kill switch.", fields: [] });
  }
  return NextResponse.json({ status: "SKIPPED", reason: "Old data engine disabled. Use /admin/ipo-engine-lite instead.", fields: [] });
}
