import fs from "fs";
import path from "path";

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
  const { supabaseAdmin } = await import("../lib/supabase");
  const { data: ipos, error } = await supabaseAdmin
    .from("ipos")
    .select(`
      id, name, slug, status,
      ai_analysis (
        score,
        label
      )
    `);
  if (error) {
    console.error("DB Error:", error);
    return;
  }
  console.log("IPOs with AI analysis:");
  for (const ipo of ipos || []) {
    // Sort ai_analysis by generated_at descending to get latest (if multiple exist)
    const ai = ipo.ai_analysis?.[0];
    console.log(`- ${ipo.name} (Slug: ${ipo.slug}) - Status: ${ipo.status} - Score: ${ai?.score ?? "N/A"} (${ai?.label ?? "N/A"})`);
  }
}

main();
