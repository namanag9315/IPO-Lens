import { supabaseAdmin } from "@/lib/supabase";
import { parseIPOPremiumDetailPage } from "@/lib/scrapers/ipoPremiumDetailParser";
import { importIPODetailData } from "@/lib/importers/importIPODetailData";

interface IPODetailSyncOptions {
  ipoId?: string;
  force?: boolean;
  dryRun?: boolean;
  triggeredBy: "admin_manual" | "cron" | "system";
}

export async function runIPODetailSync(options: IPODetailSyncOptions) {
  const startedAt = new Date().toISOString();
  let query = supabaseAdmin.from("ipos").select("id, name, slug");

  if (options.ipoId) {
    query = query.eq("id", options.ipoId);
  }

  const { data: ipos, error: iposError } = await query;
  if (iposError) throw iposError;

  let recordsFound = 0;
  let recordsSaved = 0;
  let recordsFailed = 0;
  const skipped = [];

  for (const ipo of ipos || []) {
    // Priority:
    // 1. Manually saved IPO Premium detail URL
    // 2. IPO Premium source discovered during public-data sync
    // 3. Chittorgarh detail URL (skipped since parser not implemented yet)
    // 4. IPO Guru detail URL
    const { data: sources } = await supabaseAdmin
      .from("ipo_source_documents")
      .select("*")
      .eq("ipo_id", ipo.id)
      .in("source_type", ["detail_page", "public_reference"])
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false });

    let targetSource = null;

    if (sources && sources.length > 0) {
      targetSource = sources.find(s => s.provider === "IPO Premium" || s.source_name === "IPO Premium");

      if (!targetSource) {
        const ipoGuruSource = sources.find(s => s.provider === "IPO Guru" || s.source_name === "IPO Guru");
        if (ipoGuruSource) {
          skipped.push({ ipoName: ipo.name, reason: "Unsupported source for full detail import. Add IPO Premium URL or implement IPO Guru detail parser." });
          continue;
        }
      }
    }

    if (!targetSource || !targetSource.source_url) {
      skipped.push({ ipoName: ipo.name, reason: "No supported IPO Premium detail URL available" });
      continue;
    }

    try {
      const response = await fetch(targetSource.source_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${targetSource.source_url}: ${response.status}`);
      }
      const html = await response.text();

      // Store source snapshot
      if (!options.dryRun) {
        await supabaseAdmin.from("ipo_source_snapshots").insert({
          ipo_id: ipo.id,
          source_url: targetSource.source_url,
          provider: targetSource.provider || targetSource.source_name,
          raw_html: html,
        });
      }

      // Parse with IPO Premium
      const parsedData = parseIPOPremiumDetailPage(html, targetSource.source_url);
      const sectionsFound = Object.keys(parsedData).filter(k => Array.isArray(parsedData[k as keyof typeof parsedData]) ? (parsedData[k as keyof typeof parsedData] as any[]).length > 0 : !!parsedData[k as keyof typeof parsedData]).length;
      recordsFound += sectionsFound;

      if (!options.dryRun) {
        const importResult = await importIPODetailData(ipo.id, parsedData, targetSource.provider || targetSource.source_name || "IPO Premium");
        recordsSaved += importResult.totalRowsUpserted;
      }

    } catch (error) {
      console.error(`Error importing detail for IPO ${ipo.id}:`, error);
      recordsFailed++;
      skipped.push({ ipoName: ipo.name, reason: error instanceof Error ? error.message : "Unknown parser/importer error" });
    }
  }

  const result = {
    status: recordsFailed > 0 && recordsSaved > 0 ? "PARTIAL_SUCCESS" : recordsFailed > 0 ? "FAILED" : recordsSaved === 0 && recordsFound === 0 ? "SKIPPED" : "SUCCESS",
    provider: "IPO Premium Detail",
    type: "ipo_detail",
    iposChecked: ipos?.length || 0,
    iposImported: recordsSaved > 0 ? 1 : 0, // This is simplified
    sectionsFound: recordsFound,
    fieldsSaved: recordsSaved,
    tablesUpdated: [],
    skipped,
    errors: []
  };

  if (!options.dryRun) {
    try {
      await supabaseAdmin.from("ipo_data_sync_logs").insert({
        provider: "IPO Premium Detail",
        data_type: "ipo_detail",
        status: result.status,
        records_found: recordsFound,
        records_saved: recordsSaved,
        error_message: skipped.length > 0 ? `${skipped.length} skipped` : null,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        triggered_by: options.triggeredBy,
      });
    } catch (e) {
      console.warn("Failed to save sync log", e);
    }
  }

  return result;
}
