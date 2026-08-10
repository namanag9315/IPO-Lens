import dotenv from "dotenv";
dotenv.config({ path: ".env.local", quiet: true });

import fs from "node:fs/promises";
import path from "node:path";
import { extractTablesAndText } from "@/lib/ipo-engine-clean/extractTablesAndText";
import { fetchSource } from "@/lib/ipo-engine-clean/fetchSource";
import { resolveChittorgarhDetailUrl } from "@/lib/ipo-engine-clean/resolveDetailUrlClean";
import { supabaseAdmin } from "@/lib/supabase";

function argValue(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

async function main() {
  const slug = argValue("ipo");
  if (!slug) {
    throw new Error("Usage: pnpm tsx scripts/capture-detail-fixture.ts --ipo=horizon-reclaim-india");
  }

  const { data: ipo, error: ipoError } = await supabaseAdmin.from("ipos").select("id,name,slug").eq("slug", slug).maybeSingle();
  if (ipoError) throw ipoError;
  if (!ipo) throw new Error(`IPO not found for slug: ${slug}`);

  const sourceRecords = await supabaseAdmin
    .from("ipo_source_records_clean")
    .select("matched_ipo_id,provider,raw_name,record_type,source_url")
    .eq("provider", "CHITTORGARH")
    .not("source_url", "is", null)
    .limit(500);

  const sourceLinks = await supabaseAdmin
    .from("ipo_facts_clean")
    .select("fact_key,fact_value,source_provider,source_url")
    .eq("ipo_id", ipo.id)
    .in("fact_key", ["chittorgarh_detail_url"]);

  const resolved = resolveChittorgarhDetailUrl({
    ipo,
    sourceLinks: sourceLinks.data ?? [],
    sourceRecords: (sourceRecords.data ?? []).filter((record) => record.matched_ipo_id === ipo.id || record.raw_name === ipo.name),
  });

  if (!resolved.url) {
    throw new Error(resolved.warning ?? "No Chittorgarh detail URL resolved.");
  }

  const fetched = await fetchSource(resolved.url, { retries: 1, timeoutMs: 15000 });
  if (!fetched.ok || !fetched.html) {
    throw new Error(`Fetch failed: ${fetched.error ?? "unknown"} status=${fetched.status} blocked=${fetched.blocked}`);
  }

  const extracted = extractTablesAndText(fetched.html);
  const fixtureName = `chittorgarh-detail-${slug}.html`;
  const fixtureDir = path.join(process.cwd(), "test/fixtures/ipo-engine-clean");
  await fs.mkdir(fixtureDir, { recursive: true });
  await fs.writeFile(path.join(fixtureDir, fixtureName), fetched.html);

  console.log(
    JSON.stringify(
      {
        detailUrl: resolved.url,
        headingCount: extracted.headings.length,
        headings: extracted.headings.slice(0, 10),
        htmlLength: fetched.html.length,
        savedTo: path.join(fixtureDir, fixtureName),
        tableCount: extracted.tables.length,
        tablePreviews: extracted.tables.slice(0, 8).map((table) => ({ heading: table.nearbyHeading, index: table.index, preview: table.preview })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
