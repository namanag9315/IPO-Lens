import { fetchSource } from "../lib/ipo-engine-clean/fetchSource";
import { extractTablesAndText } from "../lib/ipo-engine-clean/extractTablesAndText";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function run() {
  const url = "https://www.ipoplatform.com/ipo/subscription/susan-electricals-india-ipo/4595";
  const fetched = await fetchSource(url);
  if (!fetched.html) {
    console.error("Fetch failed:", fetched.error);
    return;
  }
  const extracted = extractTablesAndText(fetched.html);
  console.log("Tables found:", extracted.tables.length);
  for (const table of extracted.tables) {
    console.log("Heading:", table.nearbyHeading);
    console.log("Headers:", table.headers);
    console.log("Rows count:", table.rows.length);
    console.log("First Row:", table.rows[0]);
  }
}
run();
