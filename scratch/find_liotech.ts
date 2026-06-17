import { findIPOPlatformUrl } from "../lib/scrapers/ipoPlatform";

async function main() {
  const result = await findIPOPlatformUrl("Liotech Industries");
  console.log("Result:", result);
}

main();
