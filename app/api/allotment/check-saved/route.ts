import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { checkAllotment, findAllotmentIPO } from "@/lib/allotment/allotmentService";
import { getDecryptedPANProfiles } from "@/lib/allotment/panProfiles";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function readJson(request: Request) {
  try {
    return (await request.json()) as { ipoId?: string; panProfileIds?: string[] };
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Sign in to check saved PAN profiles." }, { status: 401 });
  }

  const body = await readJson(request);
  const ipoId = typeof body.ipoId === "string" ? body.ipoId : "";
  const panProfileIds = Array.isArray(body.panProfileIds) ? body.panProfileIds.filter((id) => typeof id === "string") : [];

  if (!ipoId || panProfileIds.length === 0) {
    return NextResponse.json({ error: "Select an IPO and at least one saved PAN profile." }, { status: 400 });
  }

  const ipo = await findAllotmentIPO(ipoId);

  if (!ipo) {
    return NextResponse.json({ error: "IPO was not found for allotment checking." }, { status: 404 });
  }

  try {
    const profiles = await getDecryptedPANProfiles({ ids: panProfileIds, userId: user.id });
    const results = [];

    for (const profile of profiles) {
      const result = await checkAllotment({
        checkType: "PAN",
        ipoId: ipo.id,
        registrar: ipo.registrar === "MOCK" ? "BSE" : ipo.registrar ?? "BSE",
        value: profile.pan,
      });

      results.push({
        allottedShares: result.allottedShares,
        checkedAt: result.checkedAt,
        message: result.message,
        nickname: profile.nickname,
        panMasked: result.panMasked ?? profile.panMasked,
        panProfileId: profile.id,
        source: result.source,
        status: result.status,
      });

      try {
        await supabaseAdmin.from("user_allotment_results").insert({
          allotted_shares: result.allottedShares,
          checked_at: result.checkedAt,
          ipo_id: ipo.id,
          pan_profile_id: profile.id,
          registrar: ipo.registrar === "MOCK" ? "BSE" : ipo.registrar ?? "BSE",
          source: result.source,
          status: result.status,
          user_id: user.id,
        });
      } catch {
        // Result persistence must not expose or block a checked result.
      }
    }

    return NextResponse.json({ ipoName: ipo.name, results });
  } catch {
    return NextResponse.json({ error: "Unable to check saved PAN profiles right now." }, { status: 500 });
  }
}
