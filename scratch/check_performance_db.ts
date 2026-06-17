import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  const { data: performanceRows, error } = await supabaseAdmin
    .from("listing_performance")
    .select("*, ipos(id, name, status, listing_date)")
    .order("recorded_at", { ascending: false });

  if (error) {
    console.error("Error fetching listing performance:", error);
    return;
  }

  console.log("Performance rows count:", performanceRows?.length);
  console.log("Rows:", JSON.stringify(performanceRows, null, 2));
}

main();
