import * as fs from "fs";
import * as path from "path";
import { load } from "cheerio";

function searchAll(file: string) {
  console.log(`\n=================== SEARCHING ALL: ${file} ===================`);
  const filePath = path.join(process.cwd(), "scratch", file);
  if (!fs.existsSync(filePath)) {
    console.log("File not found!");
    return;
  }
  const html = fs.readFileSync(filePath, "utf-8");
  const $ = load(html);
  
  $("*").each((i, el) => {
    const text = $(el).text().trim().replace(/\s+/g, " ");
    if (text.toLowerCase().includes("promoter")) {
      const childrenCount = $(el).children().length;
      console.log(`Tag: ${el.name}, Children: ${childrenCount}`);
      console.log(`Text: ${text.substring(0, 150)}`);
      console.log("--------------------------------------------------");
    }
  });
}

searchAll("liotech_review.html");
searchAll("liotech_main.html");
