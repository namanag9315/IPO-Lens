import * as fs from "fs";
import * as path from "path";
import { load } from "cheerio";

function search(file: string) {
  console.log(`\n=================== SEARCHING: ${file} ===================`);
  const filePath = path.join(process.cwd(), "scratch", file);
  if (!fs.existsSync(filePath)) {
    console.log("File not found!");
    return;
  }
  const html = fs.readFileSync(filePath, "utf-8");
  const $ = load(html);
  
  $("*").each((i, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text.toLowerCase().includes("promoter") && $(el).children().length === 0) {
      console.log(`Tag: ${el.name}`);
      console.log(`Text: ${text.substring(0, 200)}`);
      console.log(`Parent Tag: ${$(el).parent().prop("tagName")}`);
      console.log(`Parent Text: ${$(el).parent().text().trim().replace(/\s+/g, " ").substring(0, 300)}`);
      console.log("--------------------------------------------------");
    }
  });
}

search("liotech_review.html");
search("liotech_main.html");
