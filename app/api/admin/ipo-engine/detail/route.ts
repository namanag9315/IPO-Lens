import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { runDetailSyncClean } from "@/lib/ipo-engine-clean/sync/runDetailSyncClean";

export async function POST(request: Request) {
  const admin = await requireAdminApi(request, ["manage_ipo_data"]);
  if (admin instanceof Response) return admin;

  const body = (await request.json().catch(() => ({}))) as { financialsOnly?: boolean; ipoId?: string; limit?: number };
  const result = await runDetailSyncClean({
    financialsOnly: body.financialsOnly === true,
    ipoId: body.ipoId,
    limit: typeof body.limit === "number" ? body.limit : undefined,
  });
  const label = body.financialsOnly === true ? "Financial coverage repair" : "Detail clean sync";
  return NextResponse.json({ ...result, message: `${label} ${result.status}: ${result.saved} facts or yearly rows saved.` });
}
