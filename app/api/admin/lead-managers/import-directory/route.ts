import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    reason: "Automated lead-manager directory imports are disabled during the clean IPO engine reset.",
    status: "SKIPPED",
  });
}
