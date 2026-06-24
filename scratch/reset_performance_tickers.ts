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

const correctTickers: Record<string, string> = {
  "utkal speciality": "UTKAL.NS",
  "susan electricals": "544793.BO",
  "horizon reclaim": "544794.BO",
  "leapfrog engineering": "544797.BO",
  "liotech": "544796.BO",
  "clay craft": "CLAYCRAFT.NS",
  "diksha polymers": "544798.BO",
  "avience biomedical": "AVIENCE.NS",
  "turtlemint": "TURTLEMINT.NS",
  "advit jewels": "ADVIT.NS",
  "saffron speciality": "SAFFRON.BO",
  "anubhav plast": "ANUBHAV.BO",
  "riyaasat": "RIYA.BO"
};

async function runReset() {
  const { supabaseAdmin, isSupabaseConfigured } = await import("../lib/supabase");

  if (!isSupabaseConfigured()) {
    console.error("Supabase is not configured!");
    return;
  }

  console.log("Fetching all IPOs to reset tickers...");
  const { data: ipos, error: ipoErr } = await supabaseAdmin
    .from("ipos")
    .select("id, name, slug, enriched_data");

  if (ipoErr || !ipos) {
    console.error("Error fetching IPOs:", ipoErr);
    return;
  }

  console.log(`Found ${ipos.length} IPOs. Reviewing tickers...`);

  for (const ipo of ipos) {
    const cleanName = ipo.name.toLowerCase();
    let targetTicker: string | null = null;
    
    for (const [key, val] of Object.entries(correctTickers)) {
      if (cleanName.includes(key)) {
        targetTicker = val;
        break;
      }
    }

    if (targetTicker) {
      const enriched = { ...(ipo.enriched_data as any || {}), yahoo_ticker: targetTicker };
      // Only update enriched_data since the symbol column does not exist in the database
      const { error: updateErr } = await supabaseAdmin
        .from("ipos")
        .update({ enriched_data: enriched })
        .eq("id", ipo.id);

      if (updateErr) {
        console.error(`Failed to update ticker to ${targetTicker} for ${ipo.name}:`, updateErr.message);
      } else {
        console.log(`Updated ticker to ${targetTicker} in enriched_data for ${ipo.name}`);
      }
    }
  }

  console.log("Resetting listing_price and listing_gain_pct in listing_performance to null so they will be re-fetched...");
  const { error: resetErr } = await supabaseAdmin
    .from("listing_performance")
    .update({ listing_price: null, listing_gain_pct: null })
    .neq("id", "00000000-0000-0000-0000-000000000000"); // matches all rows

  if (resetErr) {
    console.error("Error resetting listing_performance values:", resetErr.message);
  } else {
    console.log("Successfully reset listing_performance columns in DB!");
  }
}

runReset();
