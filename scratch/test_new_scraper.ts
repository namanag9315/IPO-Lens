import { scrapeIPOPlatform } from "../lib/scrapers/ipoPlatform";

async function runTest() {
  const companyName = "Liotech Industries";
  console.log("Running scraper for:", companyName);
  const result = await scrapeIPOPlatform(companyName);
  if (!result) {
    console.error("Scrape failed: no result returned.");
    return;
  }

  console.log("\n--- SCRAPER SUCCESSFUL ---");
  console.log("URL:", result.url);
  console.log("Sector:", result.sector);
  console.log("Sub-Sector:", result.subSector);
  console.log("Overview length:", result.companyOverview?.length ?? 0);
  console.log("Overview preview:", result.companyOverview?.substring(0, 150));
  console.log("Target PE Ratio:", result.peRatio);
  console.log("Target EV/EBITDA:", result.evEbitda);
  console.log("Target Leverage Ratio:", result.leverageRatio);
  console.log("Number of Peers:", result.peers.length);
  if (result.peers.length > 0) {
    console.log("First Peer:", result.peers[0]);
  }
}

runTest();
