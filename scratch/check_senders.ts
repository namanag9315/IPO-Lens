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

async function checkSenders() {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY is not configured in .env.local");
    return;
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/senders", {
      headers: {
        "api-key": apiKey,
        "Accept": "application/json",
      }
    });
    const data = await res.json();
    console.log("Verified Senders in your Brevo Account:");
    console.log(JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Failed to fetch senders:", err.message);
  }
}

checkSenders();
