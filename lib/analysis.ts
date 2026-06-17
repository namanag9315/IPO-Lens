import { getAnchorAllocationPct } from "@/lib/anchorInvestorScoring";
import { generateIPOAnalysis } from "@/lib/groq";
import { calculateScore } from "@/lib/scoring";
import { supabaseAdmin } from "@/lib/supabase";
import type {
  AIAnalysis,
  AIResearchSummary,
  GMPHistory,
  IPO,
  IPOAnchorInvestor,
  IPOAnchorSummary,
  IPOCompanyProfile,
  IPOFinancialYearly,
  IPOObjectOfIssue,
  IPOPeerComparison,
  SubscriptionData,
} from "@/types/ipo";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

async function fetchOne<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as T | null;
}

async function fetchRows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

export async function generateAndSaveAnalysis(ipoId: string, forceRecalculate = false) {
  // 1. Fetch cached analysis
  if (!forceRecalculate) {
    const { data: cached, error: cacheErr } = await supabaseAdmin
      .from("ai_analysis")
      .select("*")
      .eq("ipo_id", ipoId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cacheErr && cached) {
      const generatedAt = new Date(cached.generated_at).getTime();
      const isFresh = Date.now() - generatedAt < SIX_HOURS_MS;
      if (isFresh && cached.summary && cached.score !== null && cached.label) {
        try {
          const parsed = JSON.parse(cached.summary);
          if (parsed.gmpView && parsed.objectsOfIssueView) {
            console.log(`[Analysis] Using cached fresh analysis for IPO ID ${ipoId}`);
            return {
              score: cached.score,
              label: cached.label,
              summary: parsed,
              cached: true
            };
          }
        } catch (e) {
          // ignore parsing error and regenerate
        }
      }
    }
  }

  // 2. Fetch all dependent tables
  const [
    ipo,
    gmpHistory,
    subscriptionHistory,
    companyProfile,
    financials,
    peers,
    anchorSummary,
    anchorInvestors,
    objectsOfIssue,
  ] = await Promise.all([
    fetchOne<IPO>(supabaseAdmin.from("ipos").select("*").eq("id", ipoId).maybeSingle()),
    fetchRows<GMPHistory>(
      supabaseAdmin.from("gmp_history").select("*").eq("ipo_id", ipoId).order("captured_at", { ascending: false }).limit(30),
    ),
    fetchRows<SubscriptionData>(
      supabaseAdmin
        .from("subscription_data")
        .select("*")
        .eq("ipo_id", ipoId)
        .order("captured_at", { ascending: false })
        .limit(30),
    ),
    fetchOne<IPOCompanyProfile>(supabaseAdmin.from("ipo_company_profiles").select("*").eq("ipo_id", ipoId).maybeSingle()),
    fetchRows<IPOFinancialYearly>(
      supabaseAdmin.from("ipo_financials_yearly").select("*").eq("ipo_id", ipoId).order("financial_year"),
    ),
    fetchRows<IPOPeerComparison>(supabaseAdmin.from("ipo_peer_comparisons").select("*").eq("ipo_id", ipoId).order("peer_name")),
    fetchOne<IPOAnchorSummary>(supabaseAdmin.from("ipo_anchor_summary").select("*").eq("ipo_id", ipoId).maybeSingle()),
    fetchRows<IPOAnchorInvestor>(
      supabaseAdmin.from("ipo_anchor_investors").select("*").eq("ipo_id", ipoId),
    ),
    fetchRows<IPOObjectOfIssue>(
      supabaseAdmin.from("ipo_objects_of_issue").select("*").eq("ipo_id", ipoId).order("amount_cr", { ascending: false }),
    ),
  ]);

  if (!ipo) {
    throw new Error(`IPO with ID ${ipoId} not found.`);
  }

  // 3. Calculate score
  const latestGMP = gmpHistory[0]?.gmp_value ?? 0;
  const latestSubscription = subscriptionHistory[0] ?? null;
  const calculated = calculateScore({
    gmp: latestGMP,
    issuePrice: ipo.price_band_high ?? 0,
    totalX: latestSubscription?.total_x ?? 0,
    qibX: latestSubscription?.qib_x ?? 0,
    niiX: latestSubscription?.nii_x ?? 0,
    retailX: latestSubscription?.retail_x ?? 0,
    issueSizeCr: ipo.issue_size_cr ?? 0,
    category: ipo.category,
    financials,
    peers,
    anchorSummary,
    anchorInvestors,
    objectsOfIssue,
    riskFactors: companyProfile?.risk_factors ?? [],
  });

  const topAnchorInvestors = anchorInvestors
    .slice()
    .sort((a, b) => getAnchorAllocationPct(b) - getAnchorAllocationPct(a))
    .slice(0, 10);

  // 4. Generate Analysis text
  const summary = await generateIPOAnalysis({
    ipo,
    companyProfile,
    financials,
    peers,
    gmpHistory,
    subscriptionHistory,
    anchorSummary,
    topAnchorInvestors,
    objectsOfIssue,
    riskFactors: companyProfile?.risk_factors ?? [],
    score: calculated.score,
    label: calculated.label,
    scoreBreakdown: calculated.breakdown,
  });

  // 5. Upsert to DB
  const { data: existing } = await supabaseAdmin
    .from("ai_analysis")
    .select("id")
    .eq("ipo_id", ipoId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload: any = {
    ipo_id: ipoId,
    score: calculated.score,
    label: calculated.label,
    summary: JSON.stringify(summary),
    generated_at: new Date().toISOString(),
  };
  if (existing?.id) {
    payload.id = existing.id;
  }

  const { error: saveErr } = await supabaseAdmin.from("ai_analysis").upsert(payload, { onConflict: "id" });
  if (saveErr) {
    throw new Error(saveErr.message);
  }

  return {
    score: calculated.score,
    label: calculated.label,
    summary,
    breakdown: calculated.breakdown,
    cached: false
  };
}
