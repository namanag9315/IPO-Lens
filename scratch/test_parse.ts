import * as fs from "fs";
import * as path from "path";
import { load } from "cheerio";

function main() {
  const filePath = path.join(process.cwd(), "scratch", "liotech_review.html");
  if (!fs.existsSync(filePath)) {
    console.log("File not found!");
    return;
  }
  
  const html = fs.readFileSync(filePath, "utf-8");
  const $ = load(html);
  
  console.log("Checking headers:");
  $("h1, h2, h3, h4, h5, h6").each((i, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text.length > 0) {
      console.log(`H${el.name.substring(1)}:`, text);
    }
  });

  console.log("\nSearching for 'Promoters' or 'Registrar' or 'Industry' in text:");
  $("*").each((i, el) => {
    if ($(el).children().length === 0) {
      const text = $(el).text().trim().replace(/\s+/g, " ");
      if (text.toLowerCase().includes("promoter") || text.toLowerCase().includes("registrar") || text.toLowerCase().includes("industry")) {
        console.log(`${el.name}: ${text.substring(0, 100)}`);
      }
    }
  });
}

main();
