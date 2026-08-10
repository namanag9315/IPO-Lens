import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    reason: "Old lite fact approval disabled during clean IPO engine reset. Use clean facts from /admin/data-engine.",
    status: "SKIPPED",
  });
}
