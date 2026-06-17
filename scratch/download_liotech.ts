import axios from "axios";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const id = "3727";
  const slug = "liotech-industries-ipo";
  const url = `https://www.ipoplatform.com/ipo/review/${slug}/${id}`;
  
  try {
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    const scratchDir = path.join(process.cwd(), "scratch");
    fs.writeFileSync(path.join(scratchDir, "liotech_review.html"), res.data);
    console.log("HTML written to scratch/liotech_review.html successfully.");
  } catch (err: any) {
    console.error("Error fetching review page HTML:", err.message);
  }
}

main();
