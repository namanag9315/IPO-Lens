import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    reason: "Old lite parser disabled during clean IPO engine reset. Use /admin/data-engine.",
    status: "SKIPPED",
  });
}
