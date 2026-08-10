import { calculateMatchConfidence } from "@/lib/ipo-data/matchIPOByName";
import { createEnrichmentJob } from "@/lib/enrichment/createEnrichmentJob";
import { detectMissingIPOFields } from "@/lib/enrichment/detectMissingIPOFields";
import { storeSourceSnapshot } from "@/lib/enrichment/storeSourceSnapshot";
import { ipoGuruGmpProvider } from "@/lib/ipo-data/providers/ipoGuruGmpProvider";
import {
  discoverChittorgarhIPOEntries,
  fetchChittorgarhResearch,
  type ChittorgarhIPOEntry,
} from "@/lib/ipo-data/providers/chittorgarhResearchProvider";
import { fetchIPOGuruResearch } from "@/lib/ipo-data/providers/ipoGuruResearchProvider";
import type { GMPDataPoint, IPOResearchDataPoint } from "@/lib/ipo-data/providers/baseProvider";
import { runLeadManagerImportJobs } from "@/lib/lead-managers/leadManagerImportQueue";
import { upsertLeadManagerAndLinkIPO } from "@/lib/lead-managers/linkLeadManagerToIPO";
import { leadManagerSlug } from "@/lib/lead-managers/normalizeLeadManagerName";
import { getComputedIPOBySlug } from "@/lib/ipoData";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";

interface IPOReference {
  category: string | null;
  close_date: string | null;
  id: string;
  listing_date: string | null;
  name: string;
  open_date: string | null;
  registrar_name?: string | null;
  slug: string;
  status: string;
}

interface ResearchSyncProviderResult {
  errorMessage: string | null;
  enrichmentJobCreated: boolean;
  enrichmentJobId: string | null;
  enrichmentSkippedReason: string | null;
  financialRowsSaved: number;
  ipoFieldsUpdated: boolean;
  ipoName: string;
  leadManagerDiscoveryFailures: number;
  leadManagerImportsQueued: number;
  leadManagersDiscovered: number;
  leadManagersLinked: number;
  missingFieldsDetected: number;
  sourceUrl: string | null;
  status: "success" | "partial" | "failed" | "skipped";
  valuationSaved: boolean;
}

export interface ResearchSyncResult {
  providers: ResearchSyncProviderResult[];
  skipped: boolean;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "Research sync failed.";
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isResearchRelevant(ipo: IPOReference) {
  if (ipo.status === "open" || ipo.status === "upcoming") {
    return true;
  }

  const today = todayIso();
  const end = ipo.listing_date ?? ipo.close_date;

  return Boolean(end && end >= today);
}

async function getIPOReferences(maxRecords: number) {
  const { data, error } = await supabaseAdmin
    .from("ipos")
    .select("id, slug, name, category, open_date, close_date, listing_date, status, registrar_name")
    .order("close_date", { ascending: true })
    .limit(maxRecords);

  if (error) {
    throw error;
  }

  return ((data ?? []) as IPOReference[]).filter(isResearchRelevant);
}

function matchingGmpPoint(ipo: IPOReference, points: GMPDataPoint[]) {
  let best: { point: GMPDataPoint; score: number } | null = null;

  for (const point of points) {
    const score = calculateMatchConfidence(point.ipoName, ipo.name, ipo.slug);

    if (!best || score > best.score) {
      best = { point, score };
    }
  }

  return best && best.score >= 0.72 ? best.point : null;
}

function guessedDetailUrls(ipo: IPOReference) {
  const base = `https://www.ipoguru.in/ipo/${ipo.slug}`;

  return Array.from(
    new Set([
      `${base}-ipo`,
      `${base}-sme-ipo`,
      base,
      `${base}-mainboard-ipo`,
    ]),
  );
}

function updatePayload(ipo: IPOReference, research: IPOResearchDataPoint) {
  const payload: Record<string, string | number | null> = {};

  if (research.category && !ipo.category) payload.category = research.category;
  if (research.closeDate && !ipo.close_date) payload.close_date = research.closeDate;
  if (research.registrar?.name && !ipo.registrar_name) payload.registrar_name = research.registrar.name;
  if (research.openDate && !ipo.open_date) payload.open_date = research.openDate;
  if (research.listingDate && !ipo.listing_date) payload.listing_date = research.listingDate;
  if (research.priceBandHigh !== null) payload.price_band_high = research.priceBandHigh;
  if (research.priceBandLow !== null) payload.price_band_low = research.priceBandLow;
  if (research.lotSize !== null) payload.lot_size = research.lotSize;
  if (research.issueSizeCr !== null) payload.issue_size_cr = research.issueSizeCr;

  return payload;
}

async function fetchFirstResearch(urls: string[]) {
  for (const url of urls) {
    try {
      const research = await fetchIPOGuruResearch(url);

      if (research) {
        return research;
      }
    } catch {
      // Try the next likely detail URL without failing the whole IPO.
    }
  }

  return null;
}

function findChittorgarhUrl(ipo: IPOReference, entries: ChittorgarhIPOEntry[]) {
  let best: { entry: ChittorgarhIPOEntry; score: number } | null = null;

  for (const entry of entries) {
    const score = calculateMatchConfidence(`${entry.label} ${entry.url}`, ipo.name, ipo.slug);

    if (!best || score > best.score) {
      best = { entry, score };
    }
  }

  return best && best.score >= 0.66 ? best.entry.url : null;
}

function needsFinancialFallback(research: IPOResearchDataPoint | null) {
  return !research || research.financials.length === 0 || !research.valuation;
}

function mergeResearch(primary: IPOResearchDataPoint | null, fallback: IPOResearchDataPoint | null) {
  if (!primary) {
    return fallback;
  }

  if (!fallback) {
    return primary;
  }

  return {
    ...primary,
    companyOverview: primary.companyOverview ?? fallback.companyOverview,
    financials: primary.financials.length > 0 ? primary.financials : fallback.financials,
    objectsOfIssue: primary.objectsOfIssue.length > 0 ? primary.objectsOfIssue : fallback.objectsOfIssue,
    companyContact: primary.companyContact ?? fallback.companyContact ?? null,
    leadManagers: primary.leadManagers?.length ? primary.leadManagers : fallback.leadManagers ?? [],
    marketMaker: primary.marketMaker ?? fallback.marketMaker ?? null,
    postIssuePromoterHoldingPct: primary.postIssuePromoterHoldingPct ?? fallback.postIssuePromoterHoldingPct,
    preIssuePromoterHoldingPct: primary.preIssuePromoterHoldingPct ?? fallback.preIssuePromoterHoldingPct,
    registrar: primary.registrar ?? fallback.registrar ?? null,
    valuation: primary.valuation ?? fallback.valuation,
  };
}

function buildSourceDocuments(research: IPOResearchDataPoint) {
  const docs = new Map<string, { title: string; type: string; url: string }>();

  const addDocument = (source: string | null | undefined, url: string | null | undefined) => {
    if (!source || !url || docs.has(url)) {
      return;
    }

    docs.set(url, {
      title: `${research.ipoName} ${source} detail`,
      type: "IPO detail",
      url,
    });
  };

  addDocument(research.source, research.sourceUrl);
  addDocument(research.valuation?.source, research.valuation?.sourceUrl);

  return Array.from(docs.values());
}

async function saveResearch(ipo: IPOReference, research: IPOResearchDataPoint) {
  const ipoUpdate = updatePayload(ipo, research);
  let ipoFieldsUpdated = false;
  let financialRowsSaved = 0;
  let leadManagerDiscoveryFailures = 0;
  let leadManagerImportsQueued = 0;
  let leadManagersDiscovered = research.leadManagers?.length ?? 0;
  let leadManagersLinked = 0;
  let enrichmentJobCreated = false;
  let enrichmentJobId: string | null = null;
  let enrichmentSkippedReason: string | null = null;
  let missingFieldsDetected = 0;
  let valuationSaved = false;
  const sourceSnapshot = await storeSourceSnapshot({
    confidence: "medium",
    ipoId: ipo.id,
    parsedJson: {
      companyOverview: research.companyOverview,
      dates: {
        allotmentDate: research.allotmentDate,
        closeDate: research.closeDate,
        listingDate: research.listingDate,
        openDate: research.openDate,
      },
      leadManagers: research.leadManagers ?? [],
      marketMaker: research.marketMaker ?? null,
      objectsOfIssue: research.objectsOfIssue,
      registrar: research.registrar ?? null,
      valuation: research.valuation,
    },
    rawHtml: research.sourceRawHtml ?? null,
    rawText: research.sourceRawText ?? research.companyOverview ?? null,
    sourceName: research.source,
    sourceType: "ipo_detail",
    sourceUrl: research.sourceUrl,
  }).catch(() => null);

  if (Object.keys(ipoUpdate).length > 0) {
    const { error } = await supabaseAdmin.from("ipos").update(ipoUpdate).eq("id", ipo.id);

    if (error) {
      throw error;
    }

    ipoFieldsUpdated = true;
  }

  if (
    research.companyOverview ||
    research.preIssuePromoterHoldingPct !== null ||
    research.postIssuePromoterHoldingPct !== null ||
    research.companyContact?.address ||
    research.companyContact?.website
  ) {
    const profilePayload: Record<string, unknown> = {
      ipo_id: ipo.id,
      source_documents: buildSourceDocuments(research),
      updated_at: research.updatedAt,
    };

    if (research.businessModel) profilePayload.business_model = research.businessModel;
    if (research.companyOverview) profilePayload.company_overview = research.companyOverview;
    if (research.companyContact?.address) profilePayload.headquarters = research.companyContact.address;
    if (research.companyContact?.website) profilePayload.website = research.companyContact.website;
    if (research.postIssuePromoterHoldingPct !== null) profilePayload.post_issue_promoter_holding_pct = research.postIssuePromoterHoldingPct;
    if (research.preIssuePromoterHoldingPct !== null) profilePayload.pre_issue_promoter_holding_pct = research.preIssuePromoterHoldingPct;

    const { error } = await supabaseAdmin.from("ipo_company_profiles").upsert(
      profilePayload,
      { onConflict: "ipo_id" },
    );

    if (error) {
      throw error;
    }
  }

  if (research.financials.length > 0) {
    const rows = research.financials.map((row) => ({
      debt_equity: row.debtEquity ?? null,
      ebitda_cr: row.ebitdaCr,
      ebitda_margin_pct: row.ebitdaMarginPct ?? null,
      eps: row.eps,
      financial_year: row.financialYear,
      net_worth_cr: row.netWorthCr ?? null,
      ipo_id: ipo.id,
      pat_cr: row.patCr,
      pat_margin_pct: row.patMarginPct,
      revenue_cr: row.revenueCr,
      roce_pct: row.rocePct,
      roe_pct: row.roePct,
      total_borrowings_cr: row.totalBorrowingsCr,
    }));
    const { error } = await supabaseAdmin.from("ipo_financials_yearly").upsert(rows, { onConflict: "ipo_id,financial_year" });

    if (error) {
      throw error;
    }

    financialRowsSaved = rows.length;
  }

  if (research.valuation) {
    const { error } = await supabaseAdmin.from("ipo_valuation_metrics").upsert(
      {
        eps: research.valuation.eps,
        ipo_id: ipo.id,
        pat_margin_pct: research.valuation.patMarginPct,
        pe_ratio: research.valuation.peRatio,
        roce_pct: research.valuation.rocePct,
        roe_pct: research.valuation.ronwPct,
        source: research.valuation.source ?? research.source,
        source_url: research.valuation.sourceUrl ?? research.sourceUrl,
        updated_at: research.updatedAt,
      },
      { onConflict: "ipo_id" },
    );

    if (error) {
      throw error;
    }

    valuationSaved = true;
  }

  for (const leadManager of research.leadManagers ?? []) {
    try {
      const linked = await upsertLeadManagerAndLinkIPO({
        confidence: leadManager.confidence,
        ipoId: ipo.id,
        name: leadManager.name,
        role: leadManager.role,
        source: leadManager.source,
        sourceUrl: leadManager.sourceUrl,
        url: leadManager.url,
      });

      if (linked.leadManagerId) leadManagersLinked += 1;
      if (linked.importQueued) leadManagerImportsQueued += 1;
      if (linked.needsReview) leadManagerDiscoveryFailures += 1;
    } catch {
      leadManagerDiscoveryFailures += 1;
    }
  }

  if (research.marketMaker?.name) {
    const slug = leadManagerSlug(research.marketMaker.name);
    const { data: marketMaker } = await supabaseAdmin
      .from("market_makers")
      .upsert(
        {
          name: research.marketMaker.name,
          slug,
          source: research.marketMaker.source ?? research.source,
          source_url: research.marketMaker.sourceUrl ?? research.sourceUrl,
          updated_at: research.updatedAt,
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();

    if (marketMaker?.id) {
      await supabaseAdmin.from("ipo_market_makers").upsert(
        {
          ipo_id: ipo.id,
          market_maker_id: marketMaker.id,
          source: research.marketMaker.source ?? research.source,
          source_url: research.marketMaker.sourceUrl ?? research.sourceUrl,
        },
        { onConflict: "ipo_id,market_maker_id" },
      );
    }
  }

  const computed = await getComputedIPOBySlug(ipo.slug).catch(() => null);
  if (computed) {
    const missingFields = detectMissingIPOFields(computed);
    missingFieldsDetected = missingFields.length;
    if (missingFields.length > 0) {
      const enrichment = await createEnrichmentJob({
        ipoId: ipo.id,
        missingFields,
        sourceSnapshotIds: sourceSnapshot?.id ? [sourceSnapshot.id] : [],
        triggeredBy: "sync",
      }).catch((error) => ({
        created: false,
        job: null,
        skippedReason: error instanceof Error ? error.message : "Unable to create enrichment job.",
      }));
      enrichmentJobCreated = enrichment.created;
      enrichmentJobId = enrichment.job?.id ?? null;
      enrichmentSkippedReason = enrichment.skippedReason;
    }
  }

  return {
    enrichmentJobCreated,
    enrichmentJobId,
    enrichmentSkippedReason,
    financialRowsSaved,
    ipoFieldsUpdated,
    leadManagerDiscoveryFailures,
    leadManagerImportsQueued,
    leadManagersDiscovered,
    leadManagersLinked,
    missingFieldsDetected,
    valuationSaved,
  };
}

export async function runIPOGuruResearchSync(options: { maxRecords?: number } = {}): Promise<ResearchSyncResult> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const ipos = await getIPOReferences(options.maxRecords ?? 15);

  if (ipos.length === 0) {
    return { providers: [], skipped: true };
  }

  const gmpPoints = await ipoGuruGmpProvider.fetch().then((result) => result.data).catch(() => []);
  const chittorgarhEntries = await discoverChittorgarhIPOEntries().catch(() => []);
  const results: ResearchSyncProviderResult[] = [];

  for (const ipo of ipos) {
    const matchedPoint = matchingGmpPoint(ipo, gmpPoints);
    const urls = [matchedPoint?.detailUrl, ...guessedDetailUrls(ipo)].filter((url): url is string => Boolean(url));

    try {
      const ipoGuruResearch = await fetchFirstResearch(urls);
      const chittorgarhUrl = needsFinancialFallback(ipoGuruResearch) ? findChittorgarhUrl(ipo, chittorgarhEntries) : null;
      const chittorgarhResearch = chittorgarhUrl ? await fetchChittorgarhResearch(chittorgarhUrl).catch(() => null) : null;
      const research = mergeResearch(ipoGuruResearch, chittorgarhResearch);

      if (!research) {
        results.push({
          enrichmentJobCreated: false,
          enrichmentJobId: null,
          enrichmentSkippedReason: "No source text available for enrichment.",
          errorMessage: "IPO Guru and Chittorgarh detail pages were not available.",
          financialRowsSaved: 0,
          ipoFieldsUpdated: false,
          ipoName: ipo.name,
          leadManagerDiscoveryFailures: 0,
          leadManagerImportsQueued: 0,
          leadManagersDiscovered: 0,
          leadManagersLinked: 0,
          missingFieldsDetected: 0,
          sourceUrl: matchedPoint?.detailUrl ?? chittorgarhUrl ?? null,
          status: "skipped",
          valuationSaved: false,
        });
        continue;
      }

      const saved = await saveResearch(ipo, research);
      const hasResearch = saved.financialRowsSaved > 0 || saved.valuationSaved || Boolean(research.companyOverview);

      results.push({
        enrichmentJobCreated: saved.enrichmentJobCreated,
        enrichmentJobId: saved.enrichmentJobId,
        enrichmentSkippedReason: saved.enrichmentSkippedReason,
        errorMessage: hasResearch ? null : "Detail page did not contain financial or valuation data yet.",
        financialRowsSaved: saved.financialRowsSaved,
        ipoFieldsUpdated: saved.ipoFieldsUpdated,
        ipoName: ipo.name,
        leadManagerDiscoveryFailures: saved.leadManagerDiscoveryFailures,
        leadManagerImportsQueued: saved.leadManagerImportsQueued,
        leadManagersDiscovered: saved.leadManagersDiscovered,
        leadManagersLinked: saved.leadManagersLinked,
        missingFieldsDetected: saved.missingFieldsDetected,
        sourceUrl: research.sourceUrl,
        status: hasResearch ? "success" : "partial",
        valuationSaved: saved.valuationSaved,
      });
    } catch (error) {
      results.push({
        enrichmentJobCreated: false,
        enrichmentJobId: null,
        enrichmentSkippedReason: null,
        errorMessage: errorMessage(error),
        financialRowsSaved: 0,
        ipoFieldsUpdated: false,
        ipoName: ipo.name,
        leadManagerDiscoveryFailures: 1,
        leadManagerImportsQueued: 0,
        leadManagersDiscovered: 0,
        leadManagersLinked: 0,
        missingFieldsDetected: 0,
        sourceUrl: matchedPoint?.detailUrl ?? null,
        status: "failed",
        valuationSaved: false,
      });
    }
  }

  await runLeadManagerImportJobs({ limit: 5 }).catch(() => null);

  return { providers: results, skipped: false };
}
