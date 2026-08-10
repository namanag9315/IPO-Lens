import * as cheerio from "cheerio";

export interface CleanExtractedTable {
  headers: string[];
  index: number;
  nearbyHeading: string;
  preview: string;
  rows: Record<string, string>[];
  rowText: string[];
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").replace(/(\d{4})T\b/g, "$1").trim();
}

function stripJunk($: cheerio.CheerioAPI) {
  $("script, style, nav, footer, header, aside, noscript, svg, iframe").remove();
  $(
    [
      ".adsbygoogle",
      "ins.adsbygoogle",
      "[aria-label*='advertisement']",
      "[data-ad]",
      "[data-ad-slot]",
      "[id^='ad-']",
      "[id$='-ad']",
      "[class~='ad']",
      "[class~='ads']",
      "[class*='advertisement']",
      "[id*='advertisement']",
      "[class*='sponsored']",
      "[id*='sponsored']",
      ".modal-backdrop",
      ".offcanvas",
      ".popup",
      ".sticky-top",
      ".fixed-top",
      ".fixed-bottom",
    ].join(","),
  ).remove();

  const junkText = /open account|you are being redirected|external broker platform|advertisement|sponsored|continue to zerodha|continue to upstox|continue to/i;
  const usefulText =
    /ipo details|ipo timetable|issue reservation|ipo lot size|company financials|financial information|key performance indicator|subscription status|registrar|lead manager|price band|issue size/i;

  $("div,section,aside,article").each((_, element) => {
    const node = $(element);
    const text = cleanText(node.text());
    if (!text || text.length > 700) return;
    if (junkText.test(text) && !usefulText.test(text)) node.remove();
  });
}

export function extractTablesAndText(html: string) {
  const $ = cheerio.load(html);
  stripJunk($);

  const headings = $("h1,h2,h3,h4,h5,h6")
    .map((_, item) => cleanText($(item).text()))
    .get()
    .filter(Boolean);

  const tables: CleanExtractedTable[] = [];
  $("table").each((index, table) => {
    let nearbyHeading = "";
    const tableNode = $(table);
    const heading = tableNode.prevAll("h1,h2,h3,h4,h5,h6,strong,b").first();
    if (heading.length) nearbyHeading = cleanText(heading.text());
    if (!nearbyHeading) nearbyHeading = cleanText(tableNode.parent().prevAll("h1,h2,h3,h4,h5,h6,strong,b").first().text());
    if (!nearbyHeading) nearbyHeading = cleanText(tableNode.closest("section,article,div").prevAll("h1,h2,h3,h4,h5,h6,strong,b").first().text());

    const firstRow = tableNode.find("tr").first();
    const hasExplicitHeaders = firstRow.find("th").length > 0;
    const firstCells = firstRow.find("th,td");
    const headers = hasExplicitHeaders
      ? firstCells.map((cellIndex, cell) => cleanText($(cell).text()) || `Column ${cellIndex + 1}`).get()
      : firstCells.map((cellIndex) => `Column ${cellIndex + 1}`).get();
    const rows: Record<string, string>[] = [];
    const rowText: string[] = [];
    tableNode.find("tr").slice(hasExplicitHeaders ? 1 : 0).each((_, row) => {
      const cells = $(row).find("td,th").map((_, cell) => cleanText($(cell).text())).get();
      if (!cells.some(Boolean)) return;
      rowText.push(cells.join(" | "));
      const record: Record<string, string> = {};
      cells.forEach((cell, cellIndex) => {
        record[headers[cellIndex] ?? `Column ${cellIndex + 1}`] = cell;
      });
      rows.push(record);
    });

    if (headers.length || rows.length) {
      tables.push({
        headers,
        index,
        nearbyHeading,
        preview: rows.slice(0, 2).map((row) => Object.values(row).join(" | ")).join(" / ").slice(0, 240),
        rowText,
        rows,
      });
    }
  });

  const clean = cleanText($("body").text());
  return {
    cleanText: clean,
    debug: {
      headingCount: headings.length,
      headingsFound: headings.length,
      tableCount: tables.length,
      tablePreviews: tables.slice(0, 8).map((table) => ({ heading: table.nearbyHeading, index: table.index, preview: table.preview })),
      textLength: clean.length,
    },
    headings,
    tables,
  };
}
