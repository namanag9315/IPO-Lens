import * as path from "path";
import * as dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { runDetailSyncClean } from "../lib/ipo-engine-clean/sync/runDetailSyncClean";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const ipoId = "be19f3b4-e119-4730-a21e-43e0466ebe07"; // Susan Electricals India

  console.log("Upserting manual IPOPlatform detail URL override...");
  const { error: insertErr } = await supabase.from("ipo_source_records_clean").insert({
    matched_ipo_id: ipoId,
    match_confidence: 100,
    match_type: "admin_override",
    normalized_name: "susan electricals india",
    payload: { purpose: "manual_ipoplatform_detail_url" },
    processed_at: new Date().toISOString(),
    provider: "IPOPLATFORM",
    raw_name: "Susan Electricals India",
    reason: "Manual IPOPlatform detail URL override for testing.",
    record_type: "detail",
    source_url: "https://www.ipoplatform.com/ipo/susan-electricals-india-ipo/4595",
    status: "matched",
  });

  if (insertErr) {
    console.error("Error upserting manual url:", insertErr.message);
  } else {
    console.log("Success upserting manual url.");
  }

  console.log("Running detail sync for Susan Electricals India...");
  const result = await runDetailSyncClean({ ipoId });
  console.log("Sync result:", JSON.stringify(result, null, 2));

  const { data: facts, error: factsErr } = await supabase
    .from("ipo_facts_clean")
    .select("fact_key, fact_value, source_provider")
    .eq("ipo_id", ipoId);

  console.log("Saved facts in ipo_facts_clean:", facts, factsErr);
}

run();
