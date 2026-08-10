import { NextResponse } from "next/server";
import { adminError, getAdminOrResponse } from "@/lib/admin/api";
import { logAdminAction } from "@/lib/admin/audit";
import { recalculateLeadManagerTrackRecord } from "@/lib/lead-managers/leadManagerService";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminOrResponse(request, ["manage_ipo_data"]);
  if (admin instanceof NextResponse) return admin;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  try {
    const score = await recalculateLeadManagerTrackRecord(params.id);

    await logAdminAction({
      action: "LEAD_MANAGER_SCORE_RECALCULATED",
      admin,
      entityId: params.id,
      entityType: "lead_manager",
      metadata: {
        finalScore: score.finalScore,
        totalIposManaged: score.totalIposManaged,
      },
    });

    return NextResponse.json({
      message: `Track record score recalculated: ${score.finalScore}/100.`,
      score,
    });
  } catch (error) {
    return adminError(error, "Unable to recalculate lead manager score.");
  }
}
