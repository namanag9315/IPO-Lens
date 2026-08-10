import { NextResponse } from "next/server";
import { checkAllotment, logAllotmentCheck } from "@/lib/allotment/allotmentService";
import { validateAllotmentRequest } from "@/lib/allotment/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { error, request: parsed } = validateAllotmentRequest(await readJson(request));

  if (error || !parsed) {
    return NextResponse.json({ error: error ?? "Invalid allotment check request." }, { status: 400 });
  }

  try {
    const result = await checkAllotment(parsed);
    await logAllotmentCheck({
      checkType: parsed.checkType,
      ipoId: parsed.ipoId,
      provider: result.source,
      registrar: parsed.registrar,
      status: result.status,
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unable to check allotment status right now." }, { status: 500 });
  }
}
