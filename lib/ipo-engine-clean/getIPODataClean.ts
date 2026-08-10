import { unstable_noStore as noStore } from "next/cache";
import { normalizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import { buildIPOResearchView } from "@/lib/ipo-engine-clean/public/buildIPOResearchView";

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function isCanonicalIPO(row: unknown) {
  if (!row || typeof row !== "object") return false;
  return (row as { is_duplicate?: boolean | null }).is_duplicate !== true;
}

function valueOfFact(fact: unknown) {
  if (fact && typeof fact === "object" && "fact_value" in fact) return (fact as { fact_value: unknown }).fact_value;
  return fact;
}

function stringFact(facts: Record<string, unknown>, key: string): string | null {
  const value = valueOfFact(facts[key]);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (value && typeof value === "object" && "value" in value) {
    const nested = (value as Record<string, unknown>).value;
    return typeof nested === "string" && nested.trim() ? nested.trim() : null;
  }
  return null;
}

function arrayFact(facts: Record<string, unknown>, key: string) {
  const value = valueOfFact(facts[key]);
  return Array.isArray(value) ? value : [];
}

function rowValue(row: Record<string, unknown>, patterns: RegExp[]) {
  for (const [key, value] of Object.entries(row)) {
    if (patterns.some((pattern) => pattern.test(key))) return value;
  }
  return null;
}

function looksLikeYearOrDate(header: string) {
  return /20\d{2}|fy\d{2}|mar|jun|sep|dec|\bfy\b/i.test(header);
}

function parseFinancials(financialTable: unknown[]) {
  if (!financialTable.length || !financialTable[0] || typeof financialTable[0] !== "object") return [];
  const first = financialTable[0] as Record<string, unknown>;
  const keys = Object.keys(first);
  const labelKey = keys[0];
  const periodKeys = keys.slice(1);

  // Reject tables where period columns don't look like years/dates (e.g. KPI tables with "Column 2")
  const validPeriodKeys = periodKeys.filter(looksLikeYearOrDate);
  if (validPeriodKeys.length === 0) return [];

  const findRow = (keywords: RegExp[]) =>
    (financialTable as Record<string, unknown>[]).find((row) => {
      const label = String(row[labelKey] ?? "").toLowerCase();
      return keywords.some((keyword) => keyword.test(label));
    });

  const revenueRow = findRow([/revenue/, /income/, /sales/]);
  const patRow = findRow([/profit after tax/, /\bpat\b/, /net profit/]);
  const assetsRow = findRow([/assets/]);
  const netWorthRow = findRow([/net worth/]);
  const borrowingsRow = findRow([/borrowing/, /debt/]);
  const roeRow = findRow([/\broe\b/, /return on net worth/, /ronw/]);
  const roceRow = findRow([/\broce\b/]);
  const epsRow = findRow([/\beps\b/]);

  // Sort periods: most recent first by extracting year number
  const yearNum = (h: string) => {
    const m = h.match(/20(\d{2})/);
    return m ? parseInt(m[1], 10) : 0;
  };
  const sortedPeriods = [...validPeriodKeys].sort((a, b) => yearNum(a) - yearNum(b));

  return sortedPeriods
    .map((period) => {
      const revenue = parseNumber(revenueRow?.[period]);
      const pat = parseNumber(patRow?.[period]);
      return {
        created_at: new Date().toISOString(),
        eps: parseNumber(epsRow?.[period]),
        financial_year: period.trim(),
        net_worth_cr: parseNumber(netWorthRow?.[period]),
        pat_cr: pat,
        pat_margin_pct: revenue && pat ? (pat / revenue) * 100 : null,
        revenue_cr: revenue,
        roce_pct: parseNumber(roceRow?.[period]),
        roe_pct: parseNumber(roeRow?.[period]),
        total_assets_cr: parseNumber(assetsRow?.[period]),
        total_borrowings_cr: parseNumber(borrowingsRow?.[period]),
      };
    })
    .filter((row) => row.revenue_cr !== null || row.pat_cr !== null || row.total_assets_cr !== null);
}

function parsePeers(peerTable: unknown[], ipoName: string) {
  if (!peerTable.length) return { ipoEPS: null as number | null, ipoPE: null as number | null, peers: [] as Array<Record<string, unknown>> };
  const peers: Array<Record<string, unknown>> = [];
  let ipoEPS: number | null = null;
  let ipoPE: number | null = null;
  const normalizedIPO = normalizeIPONameClean(ipoName);

  for (const row of peerTable as Record<string, unknown>[]) {
    const name = String(rowValue(row, [/company/i, /particular/i, /name/i]) ?? Object.values(row)[0] ?? "").trim();
    if (!name) continue;
    const pe = parseNumber(rowValue(row, [/p\/?e/i, /\bpe\b/i]));
    const eps = parseNumber(rowValue(row, [/eps/i]));
    const roe = parseNumber(rowValue(row, [/roe/i, /ronw/i]));
    const cmp = parseNumber(rowValue(row, [/cmp/i, /price/i]));
    const normalizedName = normalizeIPONameClean(name);

    if (normalizedIPO.includes(normalizedName) || normalizedName.includes(normalizedIPO)) {
      ipoPE = pe;
      ipoEPS = eps;
      continue;
    }

    peers.push({ cmp, peer_name: name, pe_ratio: pe, roe_pct: roe });
  }

  return { ipoEPS, ipoPE, peers };
}

function parseSubscriptionBreakup(subTable: unknown[]) {
  if (!Array.isArray(subTable) || subTable.length === 0) return [];
  const breakup: Array<{ category: string; reserved_applications: string | number; applied_applications: string | number }> = [];

  for (const row of subTable as Record<string, unknown>[]) {
    const firstVal = Object.values(row)[0];
    const categoryName = String(row.category ?? row.Category ?? row.Investor_Category ?? firstVal ?? "").trim();
    if (!categoryName) continue;

    const lowerName = categoryName.toLowerCase();
    let categoryKey = "";
    if (lowerName.includes("qib") || lowerName.includes("qualified")) {
      categoryKey = "qib";
    } else if (lowerName.includes("nii") || lowerName.includes("non-institutional") || lowerName.includes("hni")) {
      categoryKey = "nii";
    } else if (lowerName.includes("retail") || lowerName.includes("individual")) {
      categoryKey = "retail";
    } else if (lowerName.includes("total")) {
      categoryKey = "total";
    }

    if (!categoryKey) continue;

    let offeredVal = row.offered ?? row.Offered ?? row["Shares Offered"] ?? row["No of Shares Offered"] ?? row["Reserved"] ?? row["Shares Reserved"];
    if (offeredVal === undefined) {
      for (const [k, v] of Object.entries(row)) {
        if (/offered|reserved/i.test(k)) {
          offeredVal = v;
          break;
        }
      }
    }

    let appliedVal = row.applied ?? row.Applied ?? row["Shares Bid"] ?? row["No of Shares Bid"] ?? row["Bids"] ?? row["Bidded"];
    if (appliedVal === undefined) {
      for (const [k, v] of Object.entries(row)) {
        if (/bid|applied/i.test(k)) {
          appliedVal = v;
          break;
        }
      }
    }

    const formatValue = (val: unknown) => {
      if (val === undefined || val === null) return "-";
      if (typeof val === "number") return val;
      const cleaned = String(val).trim();
      return cleaned || "-";
    };

    breakup.push({
      category: categoryKey,
      reserved_applications: formatValue(offeredVal),
      applied_applications: formatValue(appliedVal),
    });
  }

  return breakup;
}

export async function getIPODataClean(slug: string) {
  noStore();

  if (!isSupabaseConfigured()) return null;

  let { data: ipo, error } = await supabaseAdmin
    .from("ipos")
    .select("*")
    .eq("slug", slug)
    .or("is_duplicate.is.null,is_duplicate.eq.false")
    .maybeSingle();

  if (error) {
    const fallback = await supabaseAdmin.from("ipos").select("*").eq("slug", slug).maybeSingle();
    ipo = fallback.data;
    error = fallback.error;
  }

  if (error || !ipo || !isCanonicalIPO(ipo)) return null;

  const [factRows, gmpHistory, subscriptionHistory, linkedManagers] = await Promise.all([
    supabaseAdmin.from("ipo_facts_clean").select("*").eq("ipo_id", ipo.id),
    supabaseAdmin.from("ipo_gmp_history_clean").select("*").eq("ipo_id", ipo.id).order("captured_at", { ascending: false }).limit(20),
    supabaseAdmin.from("ipo_subscription_history_clean").select("*").eq("ipo_id", ipo.id).order("captured_at", { ascending: false }).limit(20),
    supabaseAdmin.from("ipo_lead_managers").select("*, lead_managers(*)").eq("ipo_id", ipo.id),
  ]);

  let leadManagerProfile: any = null;
  const primaryLink = (linkedManagers.data ?? []).find((m: any) => m.is_primary) ?? (linkedManagers.data ?? [])[0];
  if (primaryLink?.lead_managers) {
    const lm = primaryLink.lead_managers;
    const [historyRows, scoreRows] = await Promise.all([
      supabaseAdmin.from("lead_manager_ipo_history").select("*").eq("lead_manager_id", lm.id),
      supabaseAdmin.from("lead_manager_track_record_scores").select("*").eq("lead_manager_id", lm.id).maybeSingle(),
    ]);
    leadManagerProfile = {
      name: lm.name,
      website: lm.website,
      score: scoreRows.data ? Number(scoreRows.data.final_track_record_score) : null,
      history: historyRows.data ?? [],
      scores: scoreRows.data ?? null,
    };
  }

  const facts: Record<string, unknown> = {};
  const sourceFacts: Record<string, unknown> = {};
  for (const row of (factRows.data ?? []) as Array<Record<string, unknown>>) {
    const key = String(row.fact_key ?? "");
    if (!key) continue;
    facts[key] = row.fact_value;
    sourceFacts[key] = row;
  }

  const financialsYearly = parseFinancials(arrayFact(facts, "financial_table"));
  const latestGmp = (gmpHistory.data ?? [])[0] as Record<string, unknown> | undefined;
  const latestSubscription = (subscriptionHistory.data ?? [])[0] as Record<string, unknown> | undefined;
  const peerResult = parsePeers(arrayFact(facts, "peer_valuation_table"), String(ipo.name ?? ""));
  const peerPEs = peerResult.peers
    .map((peer) => parseNumber(peer.pe_ratio))
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const priceHigh = parseNumber(stringFact(facts, "price_band")?.match(/(\d+(?:\.\d+)?)\D*$/)?.[1]) ?? parseNumber(ipo.price_band_high);
  const priceLow = parseNumber(stringFact(facts, "price_band")?.match(/(\d+(?:\.\d+)?)/)?.[1]) ?? parseNumber(ipo.price_band_low);
  const issueSize = (() => {
    const raw = stringFact(facts, "issue_size") ?? stringFact(facts, "total_issue_size");
    if (raw) {
      // Detect share counts: "52,69,200 shares" or numbers > 10000 without ₹/Cr
      const hasCr = /₹|crore|cr\b/i.test(raw);
      const hasShares = /shares?|equity/i.test(raw);
      const numVal = parseNumber(raw);
      // Accept only if: explicitly in crores, OR number is reasonably small (< 100000)
      if (hasCr && !hasShares) return numVal;
      if (numVal !== null && numVal < 10000 && !hasShares) return numVal;
      // Try to extract "up to ₹XX Cr" pattern
      const crMatch = raw.match(/(?:up\s+to\s+)?₹\s*([\d,.]+)\s*(?:crore|cr)/i);
      if (crMatch) return parseNumber(crMatch[1]);
      return parseNumber(ipo.issue_size_cr);
    }
    return parseNumber(ipo.issue_size_cr);
  })();
  const lotSize = parseNumber(stringFact(facts, "lot_size")) ?? parseNumber(ipo.lot_size);
  const latestGmpValue = parseNumber(latestGmp?.gmp_value);
  const latestGmpPercent = parseNumber(latestGmp?.gmp_pct);
  const subscriptionData = (subscriptionHistory.data ?? []).map((row: any) => ({
    captured_at: row.captured_at,
    nii_x: row.nii_x,
    qib_x: row.qib_x,
    retail_x: row.retail_x,
    total_x: row.total_x,
  }));

  const qibXFact = parseNumber(facts.qib_subscription);
  const niiXFact = parseNumber(facts.nii_subscription);
  const retailXFact = parseNumber(facts.retail_subscription);
  const totalXFact = parseNumber(facts.total_subscription);

  let latestSub = latestSubscription
    ? {
        captured_at: latestSubscription.captured_at,
        nii_x: parseNumber(latestSubscription.nii_x),
        qib_x: parseNumber(latestSubscription.qib_x),
        retail_x: parseNumber(latestSubscription.retail_x),
        total_x: parseNumber(latestSubscription.total_x),
      }
    : null;

  if (!latestSub && (qibXFact !== null || niiXFact !== null || retailXFact !== null || totalXFact !== null)) {
    latestSub = {
      captured_at: new Date().toISOString(),
      nii_x: niiXFact,
      qib_x: qibXFact,
      retail_x: retailXFact,
      total_x: totalXFact,
    };
  }

  const leadManagerName = stringFact(facts, "lead_manager_name");
  const marketMakerName = stringFact(facts, "market_maker_name");
  const objectsText = stringFact(facts, "objects_of_issue");

  return {
    ...ipo,
    allotment_date: ipo.allotment_date,
    category: ipo.category,
    close_date: stringFact(facts, "close_date") ?? ipo.close_date,
    company_profile: {
      business_model: stringFact(facts, "products_services"),
      company_overview: stringFact(facts, "company_description"),
      id: ipo.id,
      ipo_id: ipo.id,
      post_issue_promoter_holding_pct: null,
      pre_issue_promoter_holding_pct: null,
      promoters: null,
      risk_factors: arrayFact(facts, "risks"),
      sector: stringFact(facts, "sector"),
      updated_at: new Date().toISOString(),
      website: null,
    },
    drhp_url: null,
    enriched_data: {},
    enriched_fields: [],
    exchange: stringFact(facts, "listing_exchange") ?? ipo.exchange,
    field_quality: [],
    financials_yearly: financialsYearly,
    gmp_history: (gmpHistory.data ?? []).map((row: any) => ({
      captured_at: row.captured_at,
      gmp_pct: row.gmp_pct,
      gmp_value: row.gmp_value,
      source: row.source_provider,
    })),
    issue_size_cr: issueSize,
    latest_gmp: latestGmpValue,
    latest_gmp_percent: latestGmpPercent,
    latest_public_gmp_snapshot: latestGmp
      ? {
          confidence: "medium",
          estimated_listing_price: latestGmp.estimated_listing_price,
          gmp: latestGmp.gmp_value,
          gmp_percent: latestGmp.gmp_pct,
          issue_price: priceHigh,
          source: latestGmp.source_provider,
          source_url: latestGmp.source_url,
        }
      : null,
    latest_public_subscription_snapshot: latestSub
      ? {
          confidence: "medium",
          nii_times: latestSub.nii_x,
          qib_times: latestSub.qib_x,
          retail_times: latestSub.retail_x,
          source: latestSubscription?.source_provider,
          source_url: latestSubscription?.source_url,
          total_times: latestSub.total_x,
        }
      : null,
    latest_subscription: latestSub,
    lead_manager_history: [],
    lead_manager_scores: [],
    lead_managers: leadManagerName
      ? [
          {
            confidence: (sourceFacts.lead_manager_name as Record<string, unknown> | undefined)?.confidence ?? "medium",
            is_primary: true,
            lead_manager: { name: leadManagerName, source: "ipo_facts_clean", source_url: (sourceFacts.lead_manager_name as Record<string, unknown> | undefined)?.source_url ?? null, website: null },
            lead_manager_id: null,
          },
        ]
      : [],
    listing_date: stringFact(facts, "listing_date") ?? ipo.listing_date,
    lot_size: lotSize,
    market_makers: marketMakerName ? [{ market_maker: { name: marketMakerName, website: null } }] : [],
    objects_of_issue: objectsText ? [{ amount_cr: null, details: objectsText, object_name: objectsText, percentage: null }] : [],
    open_date: stringFact(facts, "open_date") ?? ipo.open_date,
    peer_comparisons: peerResult.peers,
    price_band_high: priceHigh,
    price_band_low: priceLow,
    prospectus_url: null,
    registrar_name: stringFact(facts, "registrar_name") ?? ipo.registrar_name,
    rhp_url: null,
    subscription_data: subscriptionData,
    subscription_breakup: parseSubscriptionBreakup(arrayFact(facts, "subscription_table")),
    valuation_metrics: {
      eps: peerResult.ipoEPS ?? financialsYearly.at(-1)?.eps ?? null,
      industry_pe: null,
      pat_margin_pct: financialsYearly.at(-1)?.pat_margin_pct ?? null,
      pe_ratio: peerResult.ipoPE,
      peer_median_pe: peerPEs.at(Math.floor(peerPEs.length / 2)) ?? null,
      roce_pct: financialsYearly.at(-1)?.roce_pct ?? null,
      roe_pct: financialsYearly.at(-1)?.roe_pct ?? null,
    },
    researchView: buildIPOResearchView(
      ipo,
      (factRows.data ?? []) as any[],
      gmpHistory.data ?? [],
      subscriptionHistory.data ?? [],
      leadManagerProfile
    ),
  };
}
