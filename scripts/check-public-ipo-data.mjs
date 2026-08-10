import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const requiredFiles = [
  "lib/ipo-data/providers/baseProvider.ts",
  "lib/ipo-data/providers/investorGainGmpProvider.ts",
  "lib/ipo-data/providers/ipoGuruGmpProvider.ts",
  "lib/ipo-data/providers/ipoGuruResearchProvider.ts",
  "lib/ipo-data/providers/ipoWatchGmpProvider.ts",
  "lib/ipo-data/providers/investorGainSubscriptionProvider.ts",
  "lib/ipo-data/providers/ipoWatchSubscriptionProvider.ts",
  "lib/ipo-data/providerRunner.ts",
  "lib/ipo-data/researchRunner.ts",
  "lib/ipo-data/normalizeIPOName.ts",
  "lib/ipo-data/dataQuality.ts",
  "lib/ipo-data/dataFreshness.ts",
  "app/api/sync/gmp/route.ts",
  "app/api/sync/subscription/route.ts",
  "app/api/sync/ipo-public-data/route.ts",
  "app/api/sync/ipo-research-data/route.ts",
  "app/api/sync/public-data-override/route.ts",
  "supabase/migrations/20260611000200_public_ipo_data_snapshots.sql",
  "supabase/migrations/20260612000100_ipo_valuation_metrics.sql",
  "vercel.json",
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) {
    failures.push(`Missing required file: ${file}`);
  }
}

function sourceFiles(path) {
  const absolute = join(root, path);

  if (!existsSync(absolute)) {
    return [];
  }

  if (statSync(absolute).isFile()) {
    return [path];
  }

  return readdirSync(absolute).flatMap((entry) => {
    const child = join(path, entry);

    return sourceFiles(child);
  });
}

const providerSources = sourceFiles("lib/ipo-data")
  .concat([
  "app/api/sync/gmp/route.ts",
  "app/api/sync/subscription/route.ts",
  "app/api/sync/ipo-public-data/route.ts",
  "app/api/sync/ipo-research-data/route.ts",
  "app/api/sync/public-data-override/route.ts",
])
  .filter((file) => existsSync(join(root, file)))
  .map((file) => [file, readFileSync(join(root, file), "utf8")]);

for (const [file, source] of providerSources) {
  const disallowed = ["puppeteer", "playwright", "proxy", "captcha", "nseindia.com", "bseindia.com"];

  for (const term of disallowed) {
    if (source.toLowerCase().includes(term)) {
      failures.push(`Disallowed public-data implementation term "${term}" found in ${file}`);
    }
  }
}

for (const route of [
  "app/api/sync/gmp/route.ts",
  "app/api/sync/subscription/route.ts",
  "app/api/sync/ipo-public-data/route.ts",
  "app/api/sync/ipo-research-data/route.ts",
  "app/api/sync/public-data-override/route.ts",
]) {
  const source = readFileSync(join(root, route), "utf8");

  if (!source.includes('request.headers.get("authorization") === secret')) {
    failures.push(`${route} must compare Authorization header exactly to CRON_SECRET.`);
  }

  if (/Bearer/i.test(source)) {
    failures.push(`${route} must not use Bearer auth for CRON_SECRET.`);
  }
}

const migration = readFileSync(join(root, "supabase/migrations/20260611000200_public_ipo_data_snapshots.sql"), "utf8");
for (const table of ["ipo_gmp_snapshots", "ipo_subscription_snapshots", "ipo_data_sync_logs"]) {
  if (!migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
    failures.push(`Migration does not create ${table}.`);
  }
}

const valuationMigration = readFileSync(join(root, "supabase/migrations/20260612000100_ipo_valuation_metrics.sql"), "utf8");
if (!valuationMigration.includes("CREATE TABLE IF NOT EXISTS ipo_valuation_metrics")) {
  failures.push("Migration does not create ipo_valuation_metrics.");
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const dependency of ["cheerio", "axios"]) {
  if (!pkg.dependencies?.[dependency] && !pkg.devDependencies?.[dependency]) {
    failures.push(`Missing dependency: ${dependency}`);
  }
}

for (const dependency of ["puppeteer", "playwright"]) {
  if (pkg.dependencies?.[dependency] || pkg.devDependencies?.[dependency]) {
    failures.push(`Disallowed dependency installed: ${dependency}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Public IPO data aggregator checks passed.");
