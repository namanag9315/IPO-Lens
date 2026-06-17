import { supabaseAdmin } from "./lib/supabase";

async function main() {
  console.log("Testing Supabase upsert return values...");
  try {
    // Fetch a single existing IPO to get a slug
    const { data: ipos } = await supabaseAdmin.from("ipos").select("slug, name").limit(1);
    if (!ipos || ipos.length === 0) {
      console.log("No IPOs in DB to test with.");
      return;
    }

    const sample = ipos[0];
    console.log(`Found sample IPO in DB: slug=${sample.slug}, name=${sample.name}`);

    // Try upserting it with no changes
    const { data: upsertResult, error } = await supabaseAdmin
      .from("ipos")
      .upsert({ slug: sample.slug, name: sample.name }, { onConflict: "slug" })
      .select("id, slug");

    if (error) {
      console.error("Upsert error:", error);
    } else {
      console.log("Upsert result data:", JSON.stringify(upsertResult, null, 2));
      console.log("Returned count:", upsertResult ? upsertResult.length : 0);
    }
  } catch (err: any) {
    console.error("Error in test:", err.message);
  }
}

main();
