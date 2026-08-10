import { readFileSync, existsSync } from "node:fs";

function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");

        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

const env = { ...readEnvFile(".env.local"), ...process.env };
const baseUrlArg = process.argv.find((arg) => arg.startsWith("--url="));
const baseUrl = baseUrlArg?.slice("--url=".length) || env.SYNC_BASE_URL || "http://localhost:3001";
const seedMissingIpos = !process.argv.includes("--no-seed");

if (!env.CRON_SECRET) {
  console.error("CRON_SECRET is missing from .env.local or the shell environment.");
  process.exit(1);
}

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/sync/ipo-public-data`, {
  body: JSON.stringify({ force: true, seedMissingIpos }),
  headers: {
    authorization: env.CRON_SECRET,
    "content-type": "application/json",
  },
  method: "POST",
});
const text = await response.text();

console.log(`Status: ${response.status}`);
console.log(text);

if (!response.ok) {
  process.exit(1);
}
