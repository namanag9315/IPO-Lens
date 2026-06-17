import axios from "axios";
import { load } from "cheerio";

async function main() {
  try {
    const id = "4603";
    const slug = "horizon-reclaim-india-ipo";
    const url = `https://www.ipoplatform.com/ipo/review/${slug}/${id}`;
    console.log("Fetching url:", url);
    const res = await axios.get(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const $ = load(res.data);
    
    // Let's find headings and content
    let lmTrackRecordText = "";
    $("h4, h5, div, p").each((i, el) => {
      const text = $(el).text().trim();
      if (text.includes("Track Record of") || text.includes("merchant Banker Report")) {
        // Log the next sibling elements or adjacent text
        const nextText = $(el).next().text().trim();
        console.log("Found Heading:", text);
        console.log("Next element text:", nextText);
        lmTrackRecordText = nextText || text;
      }
    });

    if (!lmTrackRecordText) {
      // Fallback search in all paragraphs
      $("p, div, li").each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes("handled") && text.includes("SME IPO") && (text.includes("listing gains") || text.includes("listed"))) {
          lmTrackRecordText = text;
          return false; // Break
        }
      });
      console.log("Fallback search text:", lmTrackRecordText);
    }

  } catch (err: any) {
    console.error("Error:", err.message);
  }
}

main();
