import axios from "axios";

async function fetchIndex(symbol: string) {
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
      }
    });
    
    const result = response.data?.chart?.result?.[0];
    if (!result) {
      console.log(`${symbol}: No result found`);
      return null;
    }
    
    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const previousClose = meta.chartPreviousClose;
    
    const change = price - previousClose;
    const changePct = (change / previousClose) * 100;
    
    console.log(`${symbol}: Price = ${price}, PreviousClose = ${previousClose}, Change = ${change.toFixed(2)} (${changePct.toFixed(2)}%)`);
    return {
      price,
      previousClose,
      change,
      changePct
    };
  } catch (e) {
    console.error(`Error fetching ${symbol}:`, e);
    return null;
  }
}

async function main() {
  await fetchIndex("^NSEI");
  await fetchIndex("^BSESN");
  await fetchIndex("^NSEBANK");
  await fetchIndex("INDIAVIX.NS");
}

main();
