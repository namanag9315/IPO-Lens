import { NextResponse } from "next/server";
import { fetchAllIPOs } from "@/lib/scrapers/ipoGuru";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase";
import type { GMPHistoryInsert, IPOInsert, SubscriptionDataInsert, ListingPerformanceInsert } from "@/types/ipo";
import { searchChittorgarhIPO, fetchChittorgarhDetails, fetchAllChittorgarhSubscriptions } from "@/lib/scrapers/chittorgarh";
import { scrapeIPOPlatform } from "@/lib/scrapers/ipoPlatform";
import { generateAndSaveAnalysis } from "@/lib/analysis";
import { guessCompanyDomain } from "@/lib/mappers/researchMapper";


export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  return Boolean(cronSecret && authorization === cronSecret);
}

async function syncIPOs(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase environment variables are not configured." }, { status: 503 });
  }

  let syncLogId: string | undefined = undefined;
  let recordsSavedCount = 0;

  try {
    const ipos = await fetchAllIPOs();
    
    // Start Sync Log
    const logPayload = {
      provider: "multi",
      data_type: "ipos+financials+peers+anchors",
      status: "running",
      records_found: ipos.length,
      records_saved: 0,
      started_at: new Date().toISOString(),
    };
    const { data: logRecord, error: logStartErr } = await supabaseAdmin
      .from("ipo_data_sync_logs")
      .insert(logPayload)
      .select("id")
      .single();
    syncLogId = logRecord?.id;
    if (logStartErr) {
      console.error("[Sync] Failed to insert sync start log:", logStartErr);
    }

    const ipoRows: IPOInsert[] = ipos.map((ipo) => ({
      slug: ipo.slug,
      name: ipo.name,
      price_band_low: ipo.price_band_low,
      price_band_high: ipo.price_band_high,
      lot_size: ipo.lot_size,
      issue_size_cr: ipo.issue_size_cr,
      category: ipo.category,
      open_date: ipo.open_date,
      close_date: ipo.close_date,
      listing_date: ipo.listing_date,
      status: ipo.status,
      registrar_name: ipo.registrar,
      face_value: ipo.face_value,
      enriched_data: {
        allotment_date: ipo.allotment_date,
        exchange: ipo.exchange,
        sale_type: ipo.sale_type,
      },
      // Required fields with defaults
      fresh_issue_amount: null,
      ofs_amount: null,
      issue_type: null,
      pre_issue_shares: null,
      post_issue_shares: null,
      canonical_ipo_id: null,
      duplicate_status: null,
      merged_at: null,
      merge_notes: null,
      is_duplicate: false,
      admin_verified: false,
    }));

    if (ipoRows.length === 0) {
      if (syncLogId) {
        await supabaseAdmin
          .from("ipo_data_sync_logs")
          .update({
            status: "success",
            records_saved: 0,
            finished_at: new Date().toISOString(),
          })
          .eq("id", syncLogId);
      }
      return NextResponse.json({ synced: 0, timestamp: new Date().toISOString() });
    }

    const { data: upsertedIPOs, error: upsertError } = await supabaseAdmin
      .from("ipos")
      .upsert(ipoRows, { onConflict: "slug" })
      .select("id, slug");

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    recordsSavedCount = ipoRows.length;

    const ipoBySlug = new Map(((upsertedIPOs ?? []) as Array<{ id: string; slug: string }>).map((ipo) => [ipo.slug, ipo.id]));
    const gmpRows: GMPHistoryInsert[] = [];
    const subscriptionRows: SubscriptionDataInsert[] = [];
    const listingPerformanceRows: ListingPerformanceInsert[] = [];

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Fetch all Chittorgarh subscriptions in bulk to avoid hitting rate limits inside the loop
    let chittorgarhSubs: Array<{ name: string; total: number }> = [];
    const useChittorgarhFallback = process.env.USE_CHITTORGARH_FALLBACK === "true";
    if (useChittorgarhFallback) {
      try {
        chittorgarhSubs = await fetchAllChittorgarhSubscriptions();
      } catch (err) {
        console.error("Error fetching bulk Chittorgarh subscriptions:", err);
      }
    }

    // Fetch existing financials map to avoid duplicate scraping
    const { data: existingFinancials } = await supabaseAdmin
      .from("ipo_financials_yearly")
      .select("ipo_id");
    const hasFinancials = new Set((existingFinancials ?? []).map((f) => f.ipo_id));

    // Fetch existing IPOs map to retrieve enriched_data
    const { data: existingIPOs } = await supabaseAdmin
      .from("ipos")
      .select("id, slug, enriched_data, face_value, lot_size, registrar_name");
    const existingIpoMap = new Map((existingIPOs ?? []).map(item => [item.slug, item]));

    for (const ipo of ipos) {
      const ipoId = ipoBySlug.get(ipo.slug);

      if (!ipoId) {
        continue;
      }

      const dbIpo = existingIpoMap.get(ipo.slug);
      const currentEnriched = (dbIpo?.enriched_data as any) || {};
      const sources: Record<string, string> = {};
      let currentSub: SubscriptionDataInsert | null = null;
      let subSource = "";

      if (ipo.current_gmp !== null) {
        gmpRows.push({
          ipo_id: ipoId,
          gmp_value: ipo.current_gmp,
          source: "ipoguru",
        });
        sources.gmp = "ipoguru";
      }

      let hasSubscription = ipo.subscription && (
        ipo.subscription.qib !== null ||
        ipo.subscription.nii !== null ||
        ipo.subscription.retail !== null ||
        ipo.subscription.total !== null
      );

      if (hasSubscription && ipo.subscription) {
        currentSub = {
          ipo_id: ipoId,
          qib_x: ipo.subscription.qib ?? 0,
          nii_x: ipo.subscription.nii ?? 0,
          retail_x: ipo.subscription.retail ?? 0,
          total_x: ipo.subscription.total ?? 0,
        };
        subSource = "ipoguru";
      }

      if (ipo.listing_price !== null || ipo.issue_price !== null) {
        listingPerformanceRows.push({
          ipo_id: ipoId,
          issue_price: ipo.issue_price,
          listing_price: ipo.listing_price,
          listing_gain_pct: ipo.listing_price && ipo.issue_price ? ((ipo.listing_price - ipo.issue_price) / ipo.issue_price) * 100 : null,
          final_gmp_at_close: null,
        });
      }

      // 1. Scrape IPOPlatform (Medium priority layer)
      let platformData = null;
      try {
        console.log(`[Sync] Attempting to scrape IPOPlatform for ${ipo.name}...`);
        platformData = await scrapeIPOPlatform(ipo.name);
      } catch (err) {
        console.error(`[Sync] IPOPlatform scrape failed for ${ipo.name}:`, err);
      }

      if (platformData) {
        console.log(`[Sync] Successfully found and scraped IPOPlatform data for ${ipo.name}`);
        
        // Save Peers
        if (platformData.peers.length > 0) {
          try {
            await supabaseAdmin.from("ipo_peer_comparisons").delete().eq("ipo_id", ipoId);
            const peerRows = platformData.peers.map(p => ({
              ipo_id: ipoId,
              peer_name: p.peer_name,
              pe_ratio: p.pe_ratio,
              roe_pct: p.roe_pct,
              revenue_cr: p.revenue_cr,
              pat_cr: p.pat_cr ?? null,
              market_cap_cr: p.market_cap_cr ?? null,
              notes: p.notes ?? null,
            }));
            const { error: peerErr } = await supabaseAdmin.from("ipo_peer_comparisons").insert(peerRows);
            if (peerErr) {
              console.error(`[Sync] Error inserting peers for ${ipo.name}:`, peerErr);
            } else {
              sources.peers = "ipoplatform";
            }
          } catch (err) {
            console.error(`[Sync] Error updating peers for ${ipo.name}:`, err);
          }
        }

        // Upsert target company profile metadata
        if (platformData.companyOverview || platformData.sector || platformData.subSector) {
          try {
            const domain = guessCompanyDomain(ipo.name);
            const profilePayload = {
              ipo_id: ipoId,
              company_overview: platformData.companyOverview ?? null,
              business_model: platformData.subSector ?? null,
              sector: platformData.sector ?? null,
              industry: platformData.sector ?? null,
              website: domain ? `https://${domain}` : null,
              promoters: "Promoters group", // default placeholder
            };
            const { error: profileErr } = await supabaseAdmin
              .from("ipo_company_profiles")
              .upsert(profilePayload, { onConflict: "ipo_id" });

            if (profileErr) {
              console.error(`[Sync] Error upserting company profile for ${ipo.name}:`, profileErr);
            } else {
              sources.company_profile = "ipoplatform";
            }
          } catch (err) {
            console.error(`[Sync] Error updating company profile for ${ipo.name}:`, err);
          }
        }

        // Save Anchor Investors
        if (platformData.anchorInvestors.length > 0) {
          try {
            await supabaseAdmin.from("ipo_anchor_investors").delete().eq("ipo_id", ipoId);
            const anchorRows = platformData.anchorInvestors.map(a => ({
              ipo_id: ipoId,
              investor_name: a.investor_name,
              shares_allotted: a.shares_allotted,
              allocation_price: a.allocation_price,
              amount_cr: a.amount_cr,
              investor_category: a.investor_category,
              scheme_name: a.scheme_name,
              percent_of_anchor_book: a.percent_of_anchor_book,
              quality_tag: a.quality_tag,
              is_marquee: a.is_marquee,
              source: a.source,
              source_url: a.source_url,
            }));
            const { error: ancErr } = await supabaseAdmin.from("ipo_anchor_investors").insert(anchorRows);
            if (ancErr) {
              console.error(`[Sync] Error inserting anchors for ${ipo.name}:`, ancErr);
            } else {
              sources.anchor_investors = "ipoplatform";
            }
          } catch (err) {
            console.error(`[Sync] Error updating anchors for ${ipo.name}:`, err);
          }
        }

        // Save Financials
        if (platformData.financials.length > 0) {
          const finRows = platformData.financials.map(f => ({
            ipo_id: ipoId,
            financial_year: f.financial_year,
            revenue_cr: f.revenue_cr,
            pat_cr: f.pat_cr,
            ebitda_cr: f.ebitda_cr,
            ebitda_margin_pct: f.ebitda_margin_pct,
            pat_margin_pct: f.pat_margin_pct,
            net_worth_cr: f.net_worth_cr,
            total_borrowings_cr: f.total_borrowings_cr,
            debt_equity: f.debt_equity,
            eps: f.eps,
            roe_pct: f.roe_pct,
            roce_pct: f.roce_pct,
          }));
          const { error: finUpsertError } = await supabaseAdmin
            .from("ipo_financials_yearly")
            .upsert(finRows, { onConflict: "ipo_id,financial_year" });
          if (finUpsertError) {
            console.error(`[Sync] Error saving financials from IPOPlatform for ${ipo.name}:`, finUpsertError);
          } else {
            sources.financials = "ipoplatform";
          }
        }

        // Save Subscription (Prefer IPOPlatform if it has categories and Guru does not, or if Guru has no subscription)
        if (platformData.subscription) {
          const guruHasCategories = currentSub && (currentSub.qib_x > 0 || currentSub.nii_x > 0 || currentSub.retail_x > 0);
          const platformHasCategories = (platformData.subscription.qib_x ?? 0) > 0 || (platformData.subscription.nii_x ?? 0) > 0 || (platformData.subscription.retail_x ?? 0) > 0;

          if (!currentSub || (!guruHasCategories && platformHasCategories)) {
            currentSub = {
              ipo_id: ipoId,
              qib_x: platformData.subscription.qib_x ?? 0,
              nii_x: platformData.subscription.nii_x ?? 0,
              retail_x: platformData.subscription.retail_x ?? 0,
              total_x: platformData.subscription.total_x ?? 0,
            };
            subSource = "ipoplatform";
          }
        }

        if (platformData.leadManager) {
          sources.lead_manager = "ipoplatform";
        }
      }

      // 2. Scrape Chittorgarh (Fallback layer)
      let details = null;
      if (useChittorgarhFallback && (!sources.financials || ipo.face_value === null || ipo.lot_size === null || !ipo.registrar)) {
        await sleep(1500); // Sleep to avoid rate limits
        console.log(`[Sync] Financials or basic details missing for ${ipo.name}. Attempting to fetch from Chittorgarh...`);
        const match = await searchChittorgarhIPO(ipo.name);
        if (match) {
          details = await fetchChittorgarhDetails(match.urlrewrite_folder_name, match.id);
          if (details) {
            // If financials were not found on IPOPlatform, use Chittorgarh
            if (!sources.financials && details.financials.length > 0) {
              const finRows = details.financials.map(f => ({
                ipo_id: ipoId,
                financial_year: f.financial_year,
                revenue_cr: f.revenue_cr,
                pat_cr: f.pat_cr,
                ebitda_cr: f.ebitda_cr,
                ebitda_margin_pct: f.ebitda_margin_pct,
                pat_margin_pct: f.pat_margin_pct,
                net_worth_cr: f.net_worth_cr,
                total_borrowings_cr: f.total_borrowings_cr,
                debt_equity: f.debt_equity,
                eps: f.eps,
                roe_pct: f.roe_pct,
                roce_pct: f.roce_pct,
              }));
              const { error: finUpsertError } = await supabaseAdmin
                .from("ipo_financials_yearly")
                .upsert(finRows, { onConflict: "ipo_id,financial_year" });
              if (finUpsertError) {
                console.error(`[Sync] Error saving financials from Chittorgarh for ${ipo.name}:`, finUpsertError);
              } else {
                sources.financials = "chittorgarh";
              }
            }
          }
        }
      }

      // 3. Chittorgarh Bulk Subscription Fallback
      if (!currentSub) {
        const cleanedIpoName = ipo.name.toLowerCase().replace(/\b(ipo|limited|ltd)\b/g, "").trim();
        const match = chittorgarhSubs.find(sub => {
          const subName = sub.name.toLowerCase();
          return subName.includes(cleanedIpoName) || cleanedIpoName.includes(subName.replace(/\b(ipo)\b/gi, "").trim());
        });

        if (match) {
          currentSub = {
            ipo_id: ipoId,
            qib_x: 0,
            nii_x: 0,
            retail_x: 0,
            total_x: match.total,
          };
          subSource = "chittorgarh";
        }
      }

      if (currentSub) {
        subscriptionRows.push(currentSub);
        sources.subscription = subSource;
      }

      // 4. Update basic details and enriched_data payload
      const updatePayload: any = {};
      if (ipo.face_value === null && details?.faceValue !== null && details?.faceValue !== undefined) {
        updatePayload.face_value = details.faceValue;
        sources.face_value = "chittorgarh";
      }
      if (ipo.lot_size === null && details?.lotSize !== null && details?.lotSize !== undefined) {
        updatePayload.lot_size = details.lotSize;
        sources.lot_size = "chittorgarh";
      }
      if (ipo.issue_size_cr === null && details?.issueSizeCr !== null && details?.issueSizeCr !== undefined) {
        updatePayload.issue_size_cr = details.issueSizeCr;
        sources.issue_size_cr = "chittorgarh";
      }
      if (!ipo.registrar && details?.registrar) {
        updatePayload.registrar_name = details.registrar;
        sources.registrar_name = "chittorgarh";
      }

      updatePayload.enriched_data = {
        ...currentEnriched,
        allotment_date: ipo.allotment_date,
        exchange: ipo.exchange || details?.exchange || (currentEnriched as any)?.exchange || null,
        sale_type: ipo.sale_type,
        lead_manager: platformData?.leadManager || (currentEnriched as any)?.lead_manager || null,
        review_text: platformData?.reviewText || (currentEnriched as any)?.review_text || null,
        lead_manager_performance: platformData?.leadManagerPerformance || (currentEnriched as any)?.lead_manager_performance || null,
        sector_performance: platformData?.sectorPerformance || (currentEnriched as any)?.sector_performance || null,
        pe_ratio: platformData?.peRatio || (currentEnriched as any)?.pe_ratio || null,
        ev_ebitda: platformData?.evEbitda || (currentEnriched as any)?.ev_ebitda || null,
        leverage_ratio: platformData?.leverageRatio || (currentEnriched as any)?.leverage_ratio || null,
        sources: {
          ...((currentEnriched as any)?.sources || {}),
          ...sources
        }
      };

      const { error: updateErr } = await supabaseAdmin.from("ipos").update(updatePayload).eq("id", ipoId);
      if (updateErr) {
        console.error(`[Sync] Error updating basic details for ${ipo.name}:`, updateErr);
      } else {
        console.log(`[Sync] Basic details and sources updated for ${ipo.name}`);
      }
    }

    if (gmpRows.length > 0) {
      const { error: gmpError } = await supabaseAdmin.from("gmp_history").insert(gmpRows);
      if (gmpError) {
        throw new Error(gmpError.message);
      }
    }

    if (subscriptionRows.length > 0) {
      const { error: subError } = await supabaseAdmin.from("subscription_data").insert(subscriptionRows);
      if (subError) {
        console.error("Subscription sync error:", subError);
      }
    }

    if (listingPerformanceRows.length > 0) {
      for (const row of listingPerformanceRows) {
        await supabaseAdmin.from("listing_performance").upsert(row, { onConflict: "id" });
      }
    }

    // 5. Trigger AI Analysis for all synced IPOs
    console.log("[Sync] Triggering AI Analysis for synced IPOs...");
    for (const ipo of ipos) {
      const ipoId = ipoBySlug.get(ipo.slug);
      if (ipoId) {
        try {
          // Force recalculate as we just synced new details
          await generateAndSaveAnalysis(ipoId, true);
          console.log(`[Sync] AI Analysis auto-generated/updated for ${ipo.name}`);
        } catch (err: any) {
          console.error(`[Sync] Failed to auto-generate AI analysis for ${ipo.name}:`, err.message);
        }
      }
    }

    // Update Sync Log as Success
    if (syncLogId) {
      await supabaseAdmin
        .from("ipo_data_sync_logs")
        .update({
          status: "success",
          records_saved: recordsSavedCount,
          finished_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return NextResponse.json({ synced: ipoRows.length, timestamp: new Date().toISOString() });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : "Unexpected error during IPO sync.";
    console.error(`[Sync] Sync job failed:`, errorMessage);

    // Update Sync Log as Error
    if (syncLogId) {
      await supabaseAdmin
        .from("ipo_data_sync_logs")
        .update({
          status: "error",
          error_message: errorMessage,
          finished_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return syncIPOs(request);
}

export async function POST(request: Request) {
  return syncIPOs(request);
}
