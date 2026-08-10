import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/auth/cronAuth";
import { runEnrichmentJobs } from "@/lib/enrichment/runEnrichmentJobs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function run(request: Request) {
  if (!isValidCronRequest(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ status: "SKIPPED", skippedReason: "GROQ_API_KEY is not configured." });
  }

  try {
    const result = await runEnrichmentJobs({ limit: 5, triggeredBy: "cron" });
    return NextResponse.json({ status: result.skippedReason ? "SKIPPED" : "SUCCESS", ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Enrichment cron failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
