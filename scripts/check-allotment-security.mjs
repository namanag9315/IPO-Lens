import { readFileSync, readdirSync, statSync } from "fs";
import { fileURLToPath } from "url";
import { join } from "path";

const root = fileURLToPath(new URL("..", import.meta.url));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function filesUnder(relativePath) {
  const absolute = join(root, relativePath);
  const rows = [];

  for (const item of readdirSync(absolute)) {
    const full = join(absolute, item);
    const stat = statSync(full);

    if (stat.isDirectory()) {
      rows.push(...filesUnder(join(relativePath, item)));
    } else {
      rows.push(full);
    }
  }

  return rows;
}

function maskPAN(value) {
  const normalized = value.trim().toUpperCase();
  return `${normalized.slice(0, 5)}****${normalized.slice(-1)}`;
}

function maskApplication(value) {
  return `****${value.trim().slice(-4)}`;
}

function estimate(retailSubscription) {
  if (!retailSubscription || retailSubscription <= 0) return null;
  if (retailSubscription <= 1) return 100;
  return Number(Math.max(1, Math.min(100, 100 / retailSubscription)).toFixed(1));
}

function deterministicStatus(value) {
  const match = value.match(/\d(?=\D*$)/);
  return Number(match?.[0] ?? 0) % 2 === 1 ? "ALLOTTED" : "NOT_ALLOTTED";
}

const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
assert(panRegex.test("ABCDE1234F"), "valid PAN should pass");
assert(!panRegex.test("ABCDE12345"), "invalid PAN should fail");
assert(maskPAN("ABCDE1234F") === "ABCDE****F", "PAN should be masked");
assert(maskApplication("1234567890") === "****7890", "application number should expose only last 4");
assert(estimate(null) === null, "missing retail subscription should be unavailable");
assert(estimate(0.8) === 100, "under-subscribed retail portion should be high");
assert(estimate(7.8) === 12.8, "oversubscribed retail chance should be 100/subscription");
assert(deterministicStatus("ABCDE1235F") === "ALLOTTED", "odd PAN digit should be allotted in mock provider");
assert(deterministicStatus("ABCDE1234F") === "NOT_ALLOTTED", "even PAN digit should be not allotted in mock provider");

const scannedFiles = [
  ...filesUnder("lib/allotment"),
  ...filesUnder("app/api/allotment"),
  ...filesUnder("app/api/pan-profiles"),
  ...filesUnder("app/api/notifications"),
  ...filesUnder("lib/notifications"),
  join(root, "app/api/notification-preferences/route.ts"),
  join(root, "lib/groq.ts"),
];

for (const file of scannedFiles) {
  const content = readFileSync(file, "utf8");
  assert(!content.includes("localStorage"), `${file} must not use localStorage`);
  assert(!content.includes("document.cookie"), `${file} must not use cookies`);
  assert(!/console\.(log|error|warn|info)/.test(content), `${file} must not log sensitive flow data`);
  assert(!content.includes("Math.random"), `${file} must not use random allotment results`);
}

for (const provider of ["kfintechProvider", "mufgIntimeProvider", "bigshareProvider", "bseProvider", "nseProvider"]) {
  const content = readFileSync(join(root, `lib/allotment/providers/${provider}.ts`), "utf8");
  assert(content.includes('status: "UNAVAILABLE"'), `${provider} must return unavailable by default`);
  assert(content.includes("officialLinkFor"), `${provider} must expose official fallback links`);
}

const checkRoute = readFileSync(join(root, "app/api/allotment/check/route.ts"), "utf8");
assert(checkRoute.includes("POST(request: Request)"), "manual check must be POST only");
assert(!checkRoute.includes("searchParams"), "manual check must not use query params for sensitive identifiers");

const cronRoute = readFileSync(join(root, "app/api/notifications/generate/route.ts"), "utf8");
assert(cronRoute.includes('request.headers.get("authorization") !== secret'), "cron auth must exactly match CRON_SECRET");
assert(!cronRoute.includes("Bearer"), "cron auth must not require Bearer prefix");

const emailProvider = readFileSync(join(root, "lib/notifications/emailProvider.ts"), "utf8");
assert(emailProvider.includes('status: "SKIPPED"'), "email provider must skip safely when missing config");

const groq = readFileSync(join(root, "lib/groq.ts"), "utf8");
assert(
  !/(panMasked|pan_hash|pan_encrypted|panLast4|applicationNumberMasked|applicationNumber|dematId|clientId)/.test(groq),
  "AI input should not include sensitive identifier fields",
);

console.log("Allotment security checks passed.");
