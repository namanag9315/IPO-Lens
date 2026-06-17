import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { generateAndSaveAnalysis } from "@/lib/analysis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readJson(request: Request): Promise<{ ipoId?: string }> {
  try {
    return (await request.json()) as { ipoId?: string };
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 503 });
  }

  try {
    const { ipoId } = await readJson(request);

    if (!ipoId) {
      return NextResponse.json({ error: "ipoId is required." }, { status: 400 });
    }

    const result = await generateAndSaveAnalysis(ipoId, false);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate IPO analysis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
