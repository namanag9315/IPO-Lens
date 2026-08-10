import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const apply = process.argv.includes("--apply");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const duplicateGroups = [
  ["Susan Electricals", "Susan Electricals India", "Susan Electricals India Limited"],
  ["Clay Craft", "Clay Craft India", "Clay Craft India Limited"],
  ["Leapfrog Engineering", "Leapfrog Engineering Services", "Leapfrog Engineering Services Limited"],
  ["Horizon Reclaim", "Horizon Reclaim India", "Horizon Reclaim (India)", "Horizon Reclaim (India) Limited"],
  ["Utkal Speciality Industries", "Utkal Speciality Industries India", "Utkal Speciality Industries Limited"],
];

const generatedTablesToClear = [
  "ipo_source_snapshots",
  "ipo_enrichment_jobs",
  "ipo_enriched_fields",
  "ipo_field_quality",
  "ipo_import_runs_lite",
  "ipo_import_staging_lite",
  "ipo_source_records_lite",
  "ipo_data_sync_logs",
];

const reassignTables = [
  "gmp_history",
  "subscription_data",
  "ipo_gmp_snapshots",
  "ipo_subscription_snapshots",
  "ipo_gmp_history_clean",
  "ipo_subscription_history_clean",
  "ipo_facts_clean",
  "ipo_source_records_clean",
];

function normalizeIPONameClean(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(private limited|pvt limited|pvt ltd|private ltd|limited|ltd|pvt|llp)\b/g, " ")
    .replace(/\b(sme ipo|mainboard ipo|ipo)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type IPORow = {
  admin_verified?: boolean | null;
  close_date?: string | null;
  id: string;
  is_duplicate?: boolean | null;
  name: string;
  slug?: string | null;
};

async function safeRows<T>(table: string) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    return { error: error.message, rows: [] as T[] };
  }
  return { error: null, rows: (data ?? []) as T[] };
}

function chooseCanonical(rows: IPORow[]) {
  return rows
    .slice()
    .sort((a, b) => {
      if (a.admin_verified && !b.admin_verified) return -1;
      if (!a.admin_verified && b.admin_verified) return 1;
      if (a.is_duplicate && !b.is_duplicate) return 1;
      if (!a.is_duplicate && b.is_duplicate) return -1;
      return (a.name.length || 0) - (b.name.length || 0);
    })[0];
}

async function countTable(table: string) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  return error ? { count: null, error: error.message } : { count: count ?? 0, error: null };
}

async function updateTableIPO(table: string, duplicateId: string, canonicalId: string) {
  const { error } = await supabase.from(table).update({ ipo_id: canonicalId }).eq("ipo_id", duplicateId);
  return error?.message ?? null;
}

async function run() {
  console.log(`IPO generated-data reset (${apply ? "APPLY" : "DRY RUN"})`);
  if (!apply) {
    console.log("No writes will be made. Re-run with --apply to mark duplicates and clear generated staging data.");
  }

  const { rows: ipos, error } = await safeRows<IPORow>("ipos");
  if (error) {
    console.error(`Unable to read ipos: ${error}`);
    process.exit(1);
  }

  const duplicateReport: Array<{ canonical: IPORow; duplicates: IPORow[]; group: string[] }> = [];
  for (const group of duplicateGroups) {
    const normalized = new Set(group.map(normalizeIPONameClean));
    const rows = ipos.filter((ipo) => normalized.has(normalizeIPONameClean(ipo.name)));
    if (rows.length < 2) continue;
    const canonical = chooseCanonical(rows);
    duplicateReport.push({ canonical, duplicates: rows.filter((row) => row.id !== canonical.id), group });
  }

  console.log(`Duplicate groups found: ${duplicateReport.length}`);
  for (const item of duplicateReport) {
    console.log(`- Canonical: ${item.canonical.name}`);
    for (const duplicate of item.duplicates) {
      console.log(`  merge candidate: ${duplicate.name} (${duplicate.id})`);
    }
  }

  const generatedCounts = await Promise.all(generatedTablesToClear.map(async (table) => ({ table, ...(await countTable(table)) })));
  console.log("Generated staging/log table counts:");
  for (const item of generatedCounts) {
    console.log(`- ${item.table}: ${item.error ? `unavailable (${item.error})` : item.count}`);
  }

  if (!apply) return;

  for (const item of duplicateReport) {
    for (const duplicate of item.duplicates) {
      for (const table of reassignTables) {
        const reassignError = await updateTableIPO(table, duplicate.id, item.canonical.id);
        if (reassignError && !/does not exist|schema cache|column/i.test(reassignError)) {
          console.warn(`${table}: unable to reassign ${duplicate.name}: ${reassignError}`);
        }
      }

      const { error: mergeError } = await supabase
        .from("ipos")
        .update({
          canonical_ipo_id: item.canonical.id,
          duplicate_status: "merged",
          is_duplicate: true,
          merge_notes: `Merged by reset-ipo-generated-data.ts into ${item.canonical.name}`,
          merged_at: new Date().toISOString(),
        })
        .eq("id", duplicate.id);
      if (mergeError) console.warn(`Unable to mark duplicate ${duplicate.name}: ${mergeError.message}`);
    }
  }

  for (const table of generatedTablesToClear) {
    const { error: deleteError } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError && !/does not exist|schema cache/i.test(deleteError.message)) {
      console.warn(`Unable to clear ${table}: ${deleteError.message}`);
    }
  }

  console.log("Apply completed. Review /admin/data-health before enabling cron.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
