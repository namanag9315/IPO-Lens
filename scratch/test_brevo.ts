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

async function test() {
  const { sendTransactionalEmail, isBrevoConfigured } = await import("@/lib/brevo");
  console.log("Is Brevo configured:", isBrevoConfigured());
  console.log("API Key:", process.env.BREVO_API_KEY ? "Present (Starts with " + process.env.BREVO_API_KEY.substring(0, 8) + ")" : "Missing");

  const testEmail = process.argv[2];
  if (!testEmail) {
    console.error("Please provide a recipient email address: npx tsx scratch/test_brevo.ts <email>");
    process.exit(1);
  }

  console.log(`Sending test email to ${testEmail}...`);
  try {
    const res = await sendTransactionalEmail(
      testEmail,
      "IPO Lens Brevo Test Integration",
      `<html><body><h1>Brevo Integration Successful!</h1><p>This is a test email from IPO Lens to confirm that Brevo API is working perfectly with the new key.</p></body></html>`
    );
    console.log("Brevo API Response:", res);
    console.log("Success! Test email sent.");
  } catch (err: any) {
    console.error("Failed to send email:", err.message);
  }
}

test();
