import * as fs from "fs";
import * as path from "path";

// Load env vars manually
try {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
      const parts = line.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/^['"]|['"]$/g, "");
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.error("Failed to load .env.local manually:", e);
}

async function runTest() {
  const { scrapeIPOPlatform } = await import("../lib/scrapers/ipoPlatform");
  const { supabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase");
  const { guessCompanyDomain } = await import("../lib/mappers/researchMapper");

  if (!isSupabaseConfigured()) {
    console.error("Supabase is not configured in environment!");
    return;
  }

  // Get a random/first IPO from database to use for testing
  const { data: ipos, error: ipoErr } = await supabaseAdmin
    .from("ipos")
    .select("id, name, slug, enriched_data")
    .limit(1);

  if (ipoErr || !ipos || ipos.length === 0) {
    console.error("Error fetching IPO from DB or no IPOs exist:");
    if (ipoErr) console.error(ipoErr);
    else console.error("No IPOs found in table.");
    return;
  }

  const testIpo = ipos[0];
  console.log(`Testing with IPO: ${testIpo.name} (ID: ${testIpo.id})`);

  console.log("Scraping IPOPlatform...");
  const platformData = await scrapeIPOPlatform(testIpo.name);
  if (!platformData) {
    console.log("No platform data found for", testIpo.name);
    return;
  }

  console.log("Scrape successful. Sector:", platformData.sector);

  // 1. Test Peer Comparisons Upsert
  if (platformData.peers.length > 0) {
    console.log(`Saving ${platformData.peers.length} peers...`);
    try {
      await supabaseAdmin.from("ipo_peer_comparisons").delete().eq("ipo_id", testIpo.id);
      const peerRows = platformData.peers.map(p => ({
        ipo_id: testIpo.id,
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
        console.error("Error inserting peers:", peerErr.message);
      } else {
        console.log("Peers saved successfully!");
      }
    } catch (err: any) {
      console.error("Peer update threw error:", err.message);
    }
  }

  // 2. Test Company Profile Upsert
  if (platformData.companyOverview || platformData.sector || platformData.subSector) {
    console.log("Saving company profile...");
    try {
      const domain = guessCompanyDomain(testIpo.name);
      const profilePayload = {
        ipo_id: testIpo.id,
        company_overview: platformData.companyOverview ?? null,
        business_model: platformData.subSector ?? null,
        sector: platformData.sector ?? null,
        industry: platformData.sector ?? null,
        website: domain ? `https://${domain}` : null,
        promoters: "Promoters group",
      };
      const { error: profileErr } = await supabaseAdmin
        .from("ipo_company_profiles")
        .upsert(profilePayload, { onConflict: "ipo_id" });

      if (profileErr) {
        console.error("Error upserting company profile:", profileErr.message);
      } else {
        console.log("Company profile upserted successfully!");
      }
    } catch (err: any) {
      console.error("Company profile update threw error:", err.message);
    }
  }

  // 3. Test basic details update (enriched_data)
  console.log("Updating enriched_data...");
  try {
    const currentEnriched = (testIpo.enriched_data as any) || {};
    const updatePayload = {
      enriched_data: {
        ...currentEnriched,
        lead_manager: platformData.leadManager || (currentEnriched as any)?.lead_manager || null,
        review_text: platformData.reviewText || (currentEnriched as any)?.review_text || null,
        pe_ratio: platformData.peRatio || (currentEnriched as any)?.pe_ratio || null,
        ev_ebitda: platformData.evEbitda || (currentEnriched as any)?.ev_ebitda || null,
        leverage_ratio: platformData.leverageRatio || (currentEnriched as any)?.leverage_ratio || null,
      }
    };
    const { error: updateErr } = await supabaseAdmin
      .from("ipos")
      .update(updatePayload)
      .eq("id", testIpo.id);

    if (updateErr) {
      console.error("Error updating enriched_data:", updateErr.message);
    } else {
      console.log("enriched_data updated successfully!");
    }
  } catch (err: any) {
    console.error("enriched_data update threw error:", err.message);
  }
}

runTest();
