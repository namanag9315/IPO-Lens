import axios from "axios";
import * as cheerio from "cheerio";

async function scrapeIndex(ticker: string) {
  const url = `https://www.google.com/finance/quote/${ticker}`;
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // The price element on Google Finance typically has class "YMlKec fxKbKc"
    const priceText = $(".YMlKec.fxKbKc").first().text().trim();
    
    // The change element typically has class "JwB61b" or is next to it
    // Let's look at the percentage change
    const changeText = $(".JwB61b").first().text().trim();
    
    // We can also see if it is positive or negative by checking the color / class
    // Google Finance uses elements with green/red attributes or icons
    const isPositive = $(".JwB61b").first().hasClass("JwB61b") && response.data.includes('aria-label="Up by');
    
    console.log(`${ticker}: Price = ${priceText}, Change = ${changeText}, Positive = ${isPositive}`);
    
    return {
      price: priceText,
      change: changeText,
      isPositive
    };
  } catch (e) {
    console.error(`Failed to scrape ${ticker}:`, e);
    return null;
  }
}

async function main() {
  await scrapeIndex("NIFTY_50:INDEXNSE");
  await scrapeIndex("SENSEX:INDEXBOM");
  await scrapeIndex("NIFTY_BANK:INDEXNSE");
}

main();
