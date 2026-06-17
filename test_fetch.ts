import fs from "fs";
import path from "path";
import axios from "axios";

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

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    console.error("Supabase config missing!");
    return;
  }
  
  console.log(`Fetching Swagger from ${url}...`);
  const response = await axios.get(url + "/rest/v1/", {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  });
  
  const defs = response.data.definitions;
  const targetTables = ['lead_managers', 'lead_manager_track_record_scores', 'lead_manager_ipo_history', 'ipo_lead_managers'];
  for (const table of targetTables) {
    if (defs[table]) {
      console.log(`\n================== ${table} PROPERTIES ==================`);
      console.log(JSON.stringify(defs[table].properties, null, 2));
    } else {
      console.log(`Table ${table} not found in definitions.`);
    }
  }
}

main();
