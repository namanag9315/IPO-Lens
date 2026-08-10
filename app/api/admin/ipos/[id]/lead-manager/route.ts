import { NextResponse } from "next/server";
import { adminError, getAdminOrResponse, readJsonBody } from "@/lib/admin/api";
import { logAdminAction } from "@/lib/admin/audit";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

interface LinkLeadManagerBody {
  isPrimary?: boolean;
  leadManagerId?: string;
  role?: string;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminOrResponse(request, ["manage_ipo_data"]);
  if (admin instanceof NextResponse) return admin;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  try {
    const body = await readJsonBody<LinkLeadManagerBody>(request, {});
    const leadManagerId = body.leadManagerId?.trim();

    if (!leadManagerId) {
      return NextResponse.json({ error: "leadManagerId is required." }, { status: 400 });
    }

    if (body.isPrimary) {
      await supabaseAdmin.from("ipo_lead_managers").update({ is_primary: false }).eq("ipo_id", params.id);
    }

    const { data, error } = await supabaseAdmin
      .from("ipo_lead_managers")
      .upsert(
        {
          ipo_id: params.id,
          is_primary: body.isPrimary ?? true,
          lead_manager_id: leadManagerId,
          role: body.role?.trim() || "lead_manager",
        },
        { onConflict: "ipo_id,lead_manager_id" },
      )
      .select("*")
      .single();

    if (error) throw error;

    await logAdminAction({
      action: "IPO_LEAD_MANAGER_LINKED",
      admin,
      entityId: params.id,
      entityType: "ipo",
      metadata: {
        isPrimary: body.isPrimary ?? true,
        leadManagerId,
        role: body.role ?? "lead_manager",
      },
    });

    return NextResponse.json({ link: data, status: "SUCCESS" });
  } catch (error) {
    return adminError(error, "Unable to link lead manager.");
  }
}
