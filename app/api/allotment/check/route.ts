import { NextResponse } from "next/server";
import { AllotmentCheckRequest } from "@/lib/allotment/types";
import { checkAllotment } from "@/lib/allotment/allotmentService";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const checkRequest: AllotmentCheckRequest = {
      ipoId: body.ipoId,
      registrar: body.registrar,
      checkType: body.checkType,
      value: body.value,
    };

    if (!checkRequest.ipoId || !checkRequest.registrar || !checkRequest.checkType || !checkRequest.value) {
      return NextResponse.json({
        status: "ERROR",
        message: "Missing required fields.",
        checkedAt: new Date().toISOString(),
      }, { status: 400 });
    }

    const result = await checkAllotment(checkRequest);

    if (isSupabaseConfigured()) {
      supabaseAdmin.from("ipo_allotment_check_logs").insert({
        ipo_id: checkRequest.ipoId,
        registrar: checkRequest.registrar,
        check_type: checkRequest.checkType,
        provider: result.source,
        status: result.status,
      }).then(({ error }) => {
        if (error) console.error("Failed to log allotment check:", error.message);
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      status: "ERROR",
      message: error.message || "An unexpected error occurred.",
      checkedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}
