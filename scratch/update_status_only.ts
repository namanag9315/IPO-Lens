import fs from "fs";
import path from "path";
import { format } from "date-fns";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1].trim();
        let value = (match[2] || "").trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1).trim();
        }
        process.env[key] = value;
      }
    });
  }
} catch (e) {
  console.error("Failed to parse .env.local", e);
}

function inferStatus(openDate: string | null, closeDate: string | null, listingDate: string | null): string {
  const today = format(new Date(), "yyyy-MM-dd");

  if (listingDate && listingDate <= today) {
    return "listed";
  }

  if (closeDate && closeDate < today) {
    return "closed";
  }

  if (openDate && closeDate && openDate <= today && closeDate >= today) {
    return "open";
  }

  return "upcoming";
}

async function main() {
  const { supabaseAdmin } = await import("@/lib/supabase");
  
  console.log("Fetching all IPO records...");
  const { data: ipos, error } = await supabaseAdmin
    .from("ipos")
    .select("id, name, status, open_date, close_date, listing_date");
    
  if (error) {
    console.error("Fetch error:", error);
    return;
  }
  
  console.log(`Analyzing ${ipos.length} records...`);
  for (const ipo of ipos) {
    const correctStatus = inferStatus(ipo.open_date, ipo.close_date, ipo.listing_date);
    if (ipo.status !== correctStatus) {
      console.log(`Updating ${ipo.name}: ${ipo.status} -> ${correctStatus}`);
      const { error: updateErr } = await supabaseAdmin
        .from("ipos")
        .update({ status: correctStatus })
        .eq("id", ipo.id);
      if (updateErr) {
        console.error(`Failed to update ${ipo.name}:`, updateErr);
      }
    } else {
      console.log(`${ipo.name} is already correct (${ipo.status})`);
    }
  }
  
  console.log("Status update run complete!");
}

main();
