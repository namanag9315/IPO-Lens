import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    reason: "Lead-manager import jobs are disabled during the clean IPO engine reset.",
    status: "SKIPPED",
  });
}
