import { NextResponse } from "next/server";
import { getAnchorAllocationPct } from "@/lib/anchorInvestorScoring";
import { generateDeterministicIPOSummary } from "@/lib/ai/deterministicIPOSummary";
import { calculateDetailedScore } from "@/lib/scoring";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type {
  AIAnalysis,
  AIAnalysisInsert,
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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

async function readJson(request: Request): Promise<{ ipoId?: string }> {
  try {
    return (await request.json()) as { ipoId?: string };
  } catch {
    return {};
  }
}

async function fetchOne<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data as T | null;
}

async function fetchRows<T>(query: PromiseLike<{ data: unknown; error: { message: string } | null }>) {
  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as T[];
}

async function fetchCachedAnalysis(ipoId: string): Promise<AIAnalysis | null> {
  return fetchOne<AIAnalysis>(
    supabaseAdmin
      .from("ai_analysis")
      .select("*")
      .eq("ipo_id", ipoId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
}

function isFreshAnalysis(analysis: AIAnalysis | null) {
  if (!analysis?.summary || analysis.score === null || !analysis.label) {
    return false;
  }

  try {
    const parsed = JSON.parse(analysis.summary) as Partial<AIResearchSummary>;

    if (!parsed.gmpView || !parsed.objectsOfIssueView) {
      return false;
    }
  } catch {
    return false;
  }

  const generatedAt = new Date(analysis.generated_at).getTime();

  if (!Number.isFinite(generatedAt)) {
    return false;
  }

  return Date.now() - generatedAt < SIX_HOURS_MS;
}

function parseSummary(summary: string | null): AIResearchSummary | string | null {
  if (!summary) {
    return null;
  }

  try {
    return JSON.parse(summary) as AIResearchSummary;
  } catch {
    return summary;
  }
}

async function saveAnalysis(existing: AIAnalysis | null, values: Omit<AIAnalysisInsert, "id">) {
  const payload = existing?.id ? { id: existing.id, ...values } : values;
  const { error } = await supabaseAdmin.from("ai_analysis").upsert(payload, { onConflict: "id" });

  if (error) {
    throw error;
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

    const cachedAnalysis = await fetchCachedAnalysis(ipoId);

    if (isFreshAnalysis(cachedAnalysis)) {
      return NextResponse.json({
        score: cachedAnalysis?.score,
        label: cachedAnalysis?.label,
        summary: parseSummary(cachedAnalysis?.summary ?? null),
        cached: true,
      });
    }

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
      return NextResponse.json({ error: "IPO not found." }, { status: 404 });
    }

    const latestGMP = gmpHistory[0]?.gmp_value ?? 0;
    const latestSubscription = subscriptionHistory[0] ?? null;
    const calculated = calculateDetailedScore({
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

    const summary = generateDeterministicIPOSummary({
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
      scoreModel: calculated.scoreModel,
      dataQualityNotes: calculated.dataQualityNotes,
    });

    await saveAnalysis(cachedAnalysis, {
      ipo_id: ipo.id,
      score: calculated.score,
      label: calculated.label,
      summary: JSON.stringify(summary),
      generated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      score: calculated.score,
      label: calculated.label,
      summary,
      breakdown: calculated.breakdown,
      cached: false,
    });
  } catch (error) {
    console.error("AI Generation Error:", error);
    const message = error instanceof Error ? error.message : "Unable to generate IPO analysis.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
