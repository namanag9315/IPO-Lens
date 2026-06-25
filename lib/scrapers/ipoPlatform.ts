import axios from "axios";
import { load } from "cheerio";
import { extractStructuredDataFromHtml } from "@/lib/groq";


// Helper to clean string name for fuzzy matching
function cleanNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(limited|ltd|ipo|fpo|india|limited-ipo|ltd-ipo|private|pvt|corp|corporation|now open|open|closed|listed|upcoming|pre open|pre-open)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

// Parses numeric values safely
function parseNum(val: string | null | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned.includes("●")) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Converts HTML tables to a clean markdown-like text representation to minimize LLM token usage
function cleanTablesToText($: any): string {
  const result: string[] = [];
  $("table").each((tblIdx: number, table: any) => {
    const rows: string[] = [];
    $(table).find("tr").each((trIdx: number, tr: any) => {
      const cells: string[] = [];
      $(tr).find("th, td").each((tdIdx: number, td: any) => {
        cells.push($(td).text().trim().replace(/\s+/g, " "));
      });
      if (cells.length > 0) {
        rows.push(cells.join(" | "));
      }
    });
    if (rows.length > 0) {
      result.push(`Table ${tblIdx + 1}:\n` + rows.join("\n"));
    }
  });
  return result.join("\n\n");
}

function parseLeadManagerPerformance(paragraph: string): {
  name: string | null;
  city: string | null;
  totalIpos: number | null;
  successRatePct: number | null;
  description: string;
} | null {
  if (!paragraph) return null;

  let totalIpos: number | null = null;
  const ipoMatch = paragraph.match(/(?:handled|managed|completed)\s+(\d+)\s+(?:SME\s+)?IPOs?/i);
  if (ipoMatch) {
    totalIpos = parseInt(ipoMatch[1], 10);
  }

  let successRatePct: number | null = null;
  
  // Try to find specific patterns first
  const gainMatch = paragraph.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of the\s+)?(?:SME\s+)?IPOs?\s+have\s+been\s+listed\s+with\s+listing\s+gains/i)
                 || paragraph.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of the\s+)?(?:SME\s+)?IPOs?\s+listed\s+with\s+gains/i)
                 || paragraph.match(/(\d+(?:\.\d+)?)\s*%\s+listed\s+with\s+gains/i)
                 || paragraph.match(/(\d+(?:\.\d+)?)\s*%\s+listed\s+at\s+premium/i);
                 
  if (gainMatch) {
    successRatePct = parseFloat(gainMatch[1]);
  } else {
    const stdMatch = paragraph.match(/of\s+which\s+\(?(\d+(?:\.\d+)?)\s*%\)?(?:\s+of\s+the\s+SME\s+IPOs)?\s+have\s+been\s+listed\s+with\s+listing\s+gains/i)
                  || paragraph.match(/of\s+which\s+\(?(\d+(?:\.\d+)?)\s*%\)?(?:\s+of\s+the\s+SME\s+IPOs)?\s+listed\s+with\s+gains/i);
    if (stdMatch) {
      successRatePct = parseFloat(stdMatch[1]);
    } else {
      const anyPctMatch = paragraph.match(/\(?(\d+(?:\.\d+)?)\s*%\)?/g);
      if (anyPctMatch) {
        if (anyPctMatch.length === 1) {
          const pct = parseFloat(anyPctMatch[0].replace(/[()%]/g, ""));
          if (paragraph.toLowerCase().includes("discount") || paragraph.toLowerCase().includes("at par")) {
            successRatePct = 100 - pct;
          } else {
            successRatePct = pct;
          }
        } else {
          const gainsMatch = paragraph.match(/(\d+(?:\.\d+)?)\s*%\s*(?:listed\s+)?with\s+gains/i) 
                          || paragraph.match(/(\d+(?:\.\d+)?)\s*%\s*(?:listed\s+)?at\s+premium/i)
                          || paragraph.match(/(\d+(?:\.\d+)?)\s*%\s*gains/i);
          if (gainsMatch) {
            successRatePct = parseFloat(gainsMatch[1]);
          }
        }
      }
    }
  }

  let name: string | null = null;
  let city: string | null = null;

  const cityMatch = paragraph.match(/(.+?),\s+based\s+in\s+([A-Za-z\s]+?)(?:[^a-zA-Z\s]+)?\s+(?:is|has)/i);
  if (cityMatch) {
    name = cityMatch[1].trim();
    city = cityMatch[2].trim();
  } else {
    const lmMatch = paragraph.match(/(.+?)\s+is\s+the\s+Lead\s+Manager/i);
    if (lmMatch) {
      name = lmMatch[1].trim();
    }
  }

  if (name) {
    name = name.replace(/^(Track Record of the Merchant Banker:\s*)/i, "").trim();
  }

  return {
    name: name || null,
    city: city || null,
    totalIpos: totalIpos || null,
    successRatePct: successRatePct || null,
    description: paragraph
  };
}



export interface IPOPlatformData {
  leadManager: string | null;
  financials: Array<{
    financial_year: string;
    revenue_cr: number | null;
    pat_cr: number | null;
    ebitda_cr: number | null;
    ebitda_margin_pct: number | null;
    pat_margin_pct: number | null;
    net_worth_cr: number | null;
    total_borrowings_cr: number | null;
    debt_equity: number | null;
    eps: number | null;
    roe_pct: number | null;
    roce_pct: number | null;
  }>;
  peers: Array<{
    peer_name: string;
    pe_ratio: number | null;
    roe_pct: number | null;
    revenue_cr: number | null;
    pat_cr?: number | null;
    market_cap_cr?: number | null;
    notes?: string | null;
  }>;
  subscription: {
    qib_x: number | null;
    nii_x: number | null;
    retail_x: number | null;
    total_x: number | null;
  } | null;
  anchorInvestors: Array<{
    investor_name: string;
    shares_allotted: number | null;
    allocation_price: number | null;
    amount_cr: number | null;
    investor_category: string;
    scheme_name: string | null;
    percent_of_anchor_book: number | null;
    quality_tag: string | null;
    is_marquee: boolean;
    source: string;
    source_url: string;
  }>;
  url: string;
  reviewText?: string | null;
  leadManagerPerformance?: {
    name: string | null;
    city: string | null;
    totalIpos: number | null;
    successRatePct: number | null;
    description: string | null;
  } | null;
  sectorPerformance?: Array<{
    name: string;
    offerPrice: number | null;
    listingPrice: number | null;
    listingGainPct: number | null;
    cmp: number | null;
    cmpPct: number | null;
  }>;
  sector: string | null;
  subSector: string | null;
  companyOverview: string | null;
  peRatio?: number | null;
  evEbitda?: number | null;
  leverageRatio?: number | null;
  registrar: string | null;
}

// Crawls list pages to discover the IPOPlatform.com details page URL
export async function findIPOPlatformUrl(companyName: string): Promise<{ slug: string; id: string; url: string } | null> {
  const lists = [
    "https://www.ipoplatform.com/",
    "https://www.ipoplatform.com/sme-ipos",
    "https://www.ipoplatform.com/list-of-sme-ipos",
    "https://www.ipoplatform.com/list-of-mainboard-ipos"
  ];

  const cleanCompany = cleanNameForMatch(companyName);
  const targetWords = cleanCompany.split(" ").filter(w => w.length > 2);
  if (targetWords.length === 0) return null;

  for (const listUrl of lists) {
    try {
      const response = await axios.get(listUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        timeout: 10000
      });
      const $ = load(response.data);
      let matched: { slug: string; id: string; url: string } | null = null;

      $("a").each((i, el) => {
        const href = $(el).attr("href") || "";
        if (!href.includes("/ipo/")) return;

        const match = href.match(/\/ipo\/([a-zA-Z0-9\-]+)\/(\d+)/);
        if (match) {
          const slug = match[1];
          const id = match[2];
          const text = $(el).text().trim();
          
          const cleanText = cleanNameForMatch(text);
          const cleanSlug = slug.replace(/-/g, " ").toLowerCase();
          const cleanSlugNoIpo = cleanSlug.replace(/\bipo\b/g, "").trim();

          // 1. Slug contains all company name words (standard case)
          const matchesSlug = targetWords.every(word => cleanSlug.includes(word));
          // 2. Anchor text contains all company name words
          const matchesText = targetWords.every(word => cleanText.includes(word));
          // 3. Anchor text is a prefix of company name or vice versa (e.g. "Waterways Leisure" for "Waterways Leisure Tourism")
          const isTextPrefix = cleanText.length >= 3 && (cleanCompany.startsWith(cleanText) || cleanText.startsWith(cleanCompany));
          // 4. Slug (without "ipo") is a prefix of company name or vice versa
          const isSlugPrefix = cleanSlugNoIpo.length >= 3 && (cleanCompany.startsWith(cleanSlugNoIpo) || cleanSlugNoIpo.startsWith(cleanCompany));

          if (matchesSlug || matchesText || isTextPrefix || isSlugPrefix) {
            matched = {
              slug,
              id,
              url: href.startsWith("http") ? href : `https://www.ipoplatform.com${href}`
            };
            return false; // Break
          }
        }
      });

      if (matched) return matched;
    } catch (err) {
      // Try next list URL
    }
  }

  return null;
}

// Scrapes rich detail pages for discovered URL
export async function scrapeIPOPlatform(
  companyName: string,
  overrideLinkInfo?: { slug: string; id: string; url: string } | null,
  options?: { onlySubscription?: boolean }
): Promise<IPOPlatformData | null> {
  const linkInfo = overrideLinkInfo ? overrideLinkInfo : await findIPOPlatformUrl(companyName);
  if (!linkInfo) return null;

  const { slug, id, url } = linkInfo;
  const finUrl = `https://www.ipoplatform.com/ipo/financial-report/${slug}/${id}`;
  const subUrl = `https://www.ipoplatform.com/ipo/subscription/${slug}/${id}`;
  const peerUrl = `https://www.ipoplatform.com/ipo/peer-comparison/${slug}/${id}`;

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  let leadManager: string | null = null;
  let registrar: string | null = null;
  const financials: IPOPlatformData["financials"] = [];
  const peers: IPOPlatformData["peers"] = [];
  let subscription: IPOPlatformData["subscription"] = null;
  const sectorPerformance: IPOPlatformData["sectorPerformance"] = [];

  let sector: string | null = null;
  let subSector: string | null = null;
  let companyOverview: string | null = null;
  let peRatio: number | null = null;
  let evEbitda: number | null = null;
  let leverageRatio: number | null = null;

  // 1. Scrape Main Page (Lead Manager & Company profile metadata)
  if (!options?.onlySubscription) {
    try {
      const mainRes = await axios.get(url, { headers, timeout: 10000 });
      const $main = load(mainRes.data);
      $main("li, div, td, span").each((i, el) => {
        const text = $main(el).text().trim();
        if (text.startsWith("Merchant Banker:") || text.startsWith("Lead Manager:")) {
          const rawLM = text.replace(/Merchant Banker:|Lead Manager:/, "").trim().replace(/\s+/g, " ");
          leadManager = rawLM.split(/sme ipo|by brlm|track record/i)[0].trim();
          return false;
        }
      });

      // Scrape Sector
      $main('i.fa-industry, i.fa-briefcase').each((i, el) => {
        const bTag = $main(el).parent().find('b.brand-primary');
        if (bTag.length > 0) {
          sector = bTag.text().trim();
          return false;
        }
      });
      if (!sector) {
        $main('a[href*="/know-your-sector/"]').each((i, el) => {
          const text = $main(el).text().trim();
          if (text) {
            sector = text;
            return false;
          }
        });
      }

      // Scrape Sub Sector
      $main('h5').each((i, el) => {
        const text = $main(el).text().trim();
        if (text.toLowerCase().includes("sub sector")) {
          subSector = $main(el).find('b.brand-primary').text().trim() || text.replace(/sub sector\s*:\s*/i, "").trim();
          return false;
        }
      });

      // Scrape Company Overview
      const previewEl = $main('#company-info-preview');
      if (previewEl.length > 0) {
        companyOverview = previewEl.text().trim().replace(/\s+/g, " ");
      } else {
        const fullEl = $main('#company-info-full');
        if (fullEl.length > 0) {
          companyOverview = fullEl.text().trim().replace(/\s+/g, " ");
        }
      }

      // Scrape Registrar
      $main("h3").each((i, el) => {
        const text = $main(el).text().trim();
        if (text.toLowerCase().includes("registrar (rta)")) {
          const nextB = $main(el).nextAll("b.brand-primary").first();
          if (nextB.length > 0) {
            registrar = nextB.text().trim().replace(/\s+/g, " ");
          }
          return false; // Break
        }
      });
    } catch (err) {
      console.error(`IPOPlatform: Main scrape failed for ${companyName}:`, err);
    }
  }

  // 2. Scrape Financials
  if (!options?.onlySubscription) {
    try {
      const finRes = await axios.get(finUrl, { headers, timeout: 10000 });
      const $fin = load(finRes.data);
      
      // Financial statements tables
      const records: Array<any> = [];
      $fin("table").each((tblIdx, table) => {
        const rows: string[][] = [];
        $fin(table).find("tr").each((trIdx, tr) => {
          const row: string[] = [];
          $fin(tr).find("th, td").each((tdIdx, td) => {
            row.push($fin(td).text().trim().replace(/\s+/g, " "));
          });
          rows.push(row);
        });

        if (rows.length > 0) {
          const headerRow = rows[0];
          // Headers look like: [ 'Financials', 'FY26', 'FY25', 'FY24' ]
          const hasYears = headerRow.some(cell => /FY\d+|31 Mar|\d{4}/i.test(cell));
          if (hasYears) {
            const years = headerRow.slice(1).filter(Boolean);
            
            // Initialize records list if empty
            if (records.length === 0) {
              years.forEach(yr => {
                records.push({
                  financial_year: yr,
                  revenue_cr: null,
                  pat_cr: null,
                  ebitda_cr: null,
                  ebitda_margin_pct: null,
                  pat_margin_pct: null,
                  net_worth_cr: null,
                  total_borrowings_cr: null,
                  debt_equity: null,
                  eps: null,
                  roe_pct: null,
                  roce_pct: null
                });
              });
            }

            // Map values
            rows.slice(1).forEach(row => {
              const label = row[0]?.toLowerCase() || "";
              const values = row.slice(1);

              const isRev = label.includes("revenue") && !label.includes("margin") && !label.includes("growth");
              const isPat = label.includes("pat") && !label.includes("margin") && !label.includes("growth");
              const isEbitda = label.includes("ebitda") && !label.includes("margin") && !label.includes("growth");
              const isNetWorth = label.includes("net worth");
              const isDebt = (label.includes("debt") || label.includes("borrowing")) && !label.includes("equity") && !label.includes("particulars");
              const isEbitdaMargin = label.includes("ebitda margin");
              const isPatMargin = label.includes("pat margin");
              const isEps = label.includes("eps");
              const isRoe = label.includes("roe") || label.includes("ronw");
              const isRoce = label.includes("roce");
              const isDebtEquity = label.includes("debt to equity") || label.includes("debt/equity");

              for (let i = 0; i < records.length; i++) {
                const val = parseNum(values[i]);
                if (val === null) continue;

                if (isRev) records[i].revenue_cr = val;
                else if (isPat) records[i].pat_cr = val;
                else if (isEbitda) records[i].ebitda_cr = val;
                else if (isNetWorth) records[i].net_worth_cr = val;
                else if (isDebt) records[i].total_borrowings_cr = val;
                else if (isEbitdaMargin) records[i].ebitda_margin_pct = val;
                else if (isPatMargin) records[i].pat_margin_pct = val;
                else if (isEps) records[i].eps = val;
                else if (isRoe) records[i].roe_pct = val;
                else if (isRoce) records[i].roce_pct = val;
                else if (isDebtEquity) records[i].debt_equity = val;
              }
            });
          }
        }
      });

      if (records.length > 0) {
        financials.push(...records);
      }

      if (financials.length === 0) {
        console.log(`[Sync] Cheerio financials parsing returned 0 records for ${companyName}. Triggering AI Fallback...`);
        const tablesText = cleanTablesToText($fin);
        if (tablesText.trim().length > 0) {
          const schema = `{
            "financials": [
              {
                "financial_year": "string (e.g. FY26 or 31 Mar 2026)",
                "revenue_cr": number | null,
                "pat_cr": number | null,
                "ebitda_cr": number | null,
                "ebitda_margin_pct": number | null,
                "pat_margin_pct": number | null,
                "net_worth_cr": number | null,
                "total_borrowings_cr": number | null,
                "debt_equity": number | null,
                "eps": number | null,
                "roe_pct": number | null,
                "roce_pct": number | null
              }
            ]
          }`;
          const aiResult = await extractStructuredDataFromHtml<{ financials: IPOPlatformData["financials"] }>(
            tablesText,
            "financial reports / financial statements tables",
            schema
          );
          if (aiResult && Array.isArray(aiResult.financials)) {
            console.log(`[Sync] AI Fallback successfully extracted ${aiResult.financials.length} financials for ${companyName}`);
            financials.push(...aiResult.financials);
          }
        }
      }
    } catch (err: any) {
      console.error(`IPOPlatform: Financials scrape failed for ${companyName}:`, err.message);
    }
  }

  // 3. Scrape Subscription
  try {
    const subRes = await axios.get(subUrl, { headers, timeout: 10000 });
    const $sub = load(subRes.data);
    let qib: number | null = null;
    let nii: number | null = null;
    let retail: number | null = null;
    let total: number | null = null;

    $sub("table").each((tblIdx, table) => {
      let isMainSubTable = false;
      $sub(table).find("tr").each((rIdx, tr) => {
        const rowCells: string[] = [];
        $sub(tr).find("th, td").each((cIdx, cell) => {
          rowCells.push($sub(cell).text().trim().toLowerCase());
        });
        if (rowCells.some(h => h.includes("subscription") && h.includes("times"))) {
          isMainSubTable = true;
          return false; // Break row loop
        }
      });

      if (!isMainSubTable) return;

      $sub(table).find("tr").each((trIdx, tr) => {
        const cells: string[] = [];
        $sub(tr).find("th, td").each((tdIdx, td) => {
          cells.push($sub(td).text().trim().replace(/\s+/g, " "));
        });

        if (cells.length > 1) {
          const category = cells[0].toLowerCase();
          const subTimes = parseNum(cells[1]);

          // Ignore anchor and market maker rows (ensure QIB ex-anchor is not ignored)
          const isAnchorRow = category.includes("anchor") && !category.includes("qib");
          if (isAnchorRow || category.includes("market maker")) {
            return;
          }

          // Ignore sub-categories of NII/HNI (like bNII, sNII)
          const isSubNii = category.includes("bnii") || category.includes("snii") || category.includes("b-hni") || category.includes("s-hni") || category.startsWith("-") || category.startsWith("–");
          if (isSubNii) {
            return;
          }

          if (category.includes("qib")) {
            qib = subTimes;
          } else if (category.includes("non-institutional") || category.includes("nii")) {
            nii = subTimes;
          } else if (category.includes("retail") || category.includes("rii")) {
            retail = subTimes;
          } else if (category.includes("total")) {
            total = subTimes;
          }
        }
      });
    });

    if (total !== null || qib !== null || nii !== null || retail !== null) {
      subscription = {
        qib_x: qib,
        nii_x: nii,
        retail_x: retail,
        total_x: total
      };
    }
  } catch (err) {
    console.error(`IPOPlatform: Subscription scrape failed for ${companyName}:`, err);
  }

  // 4. Scrape Peers
  if (!options?.onlySubscription) {
    try {
      const peerRes = await axios.get(peerUrl, { headers, timeout: 10000 });
      const $peer = load(peerRes.data);
      const companyCleaned = cleanNameForMatch(companyName);

      // populated using outer scope variable
      sectorPerformance.length = 0;

      $peer("table").each((tblIdx, table) => {
        // Verify headers
        const headersRow: string[] = [];
        $peer(table).find("tr").first().find("th, td").each((i, cell) => {
          headersRow.push($peer(cell).text().trim().toLowerCase());
        });

        if (headersRow.includes("company name") || headersRow.some(h => h.includes("company") || h.includes("peer"))) {
          const nameIdx = headersRow.findIndex(h => h.includes("company name") || h.includes("company") || h === "name");
          const peIdx = headersRow.findIndex(h => h === "pe" || h.includes("p/e") || h.includes("pe ratio") || h.includes("price/earnings"));
          const roeIdx = headersRow.findIndex(h => h.includes("ronw") || h.includes("roe") || h.includes("return on net worth") || h.includes("return on networth"));
          const revIdx = headersRow.findIndex(h => h.includes("revenue") || h.includes("total income") || h.includes("sales") || h.includes("turnover"));

          $peer(table).find("tr").slice(1).each((trIdx, tr) => {
            const cells: string[] = [];
            $peer(tr).find("td").each((i, cell) => {
              cells.push($peer(cell).text().trim().replace(/\s+/g, " "));
            });

            if (cells.length > 0 && nameIdx !== -1 && nameIdx < cells.length) {
              const peerName = cells[nameIdx];
              if (!peerName) return;
              const peerCleaned = cleanNameForMatch(peerName);

              // Avoid adding target company itself
              if (!peerCleaned.includes(companyCleaned) && !companyCleaned.includes(peerCleaned)) {
                peers.push({
                  peer_name: peerName,
                  pe_ratio: (peIdx !== -1 && peIdx < cells.length) ? parseNum(cells[peIdx]) : null,
                  roe_pct: (roeIdx !== -1 && roeIdx < cells.length) ? parseNum(cells[roeIdx]) : null,
                  revenue_cr: (revIdx !== -1 && revIdx < cells.length) ? parseNum(cells[revIdx]) : null
                });
              }
            }
          });
        } else if (headersRow.includes("offer price") && (headersRow.includes("listing gain") || headersRow.includes("listing price"))) {
          const nameIdx = headersRow.findIndex(h => h === "name" || h.includes("company") || h.includes("ipo"));
          const offerIdx = headersRow.findIndex(h => h.includes("offer"));
          const listingIdx = headersRow.findIndex(h => h.includes("listing price") || h === "listing price");
          const gainIdx = headersRow.findIndex(h => h.includes("listing gain") || h === "listing gain");
          const cmpIdx = headersRow.findIndex(h => h === "cmp");
          const cmpPctIdx = headersRow.findIndex(h => h.includes("cmp %") || h.includes("% cmp") || h === "cmp %" || h === "% cmp");

          $peer(table).find("tr").slice(1).each((trIdx, tr) => {
            const cells: string[] = [];
            $peer(tr).find("td").each((i, cell) => {
              cells.push($peer(cell).text().trim().replace(/\s+/g, " "));
            });

            if (cells.length > 0 && nameIdx !== -1 && nameIdx < cells.length) {
              const peerName = cells[nameIdx].replace(/financial report\s*>>/gi, "").trim();
              if (!peerName) return;

              sectorPerformance.push({
                name: peerName,
                offerPrice: (offerIdx !== -1 && offerIdx < cells.length) ? parseNum(cells[offerIdx]) : null,
                listingPrice: (listingIdx !== -1 && listingIdx < cells.length) ? parseNum(cells[listingIdx]) : null,
                listingGainPct: (gainIdx !== -1 && gainIdx < cells.length) ? parseNum(cells[gainIdx]) : null,
                cmp: (cmpIdx !== -1 && cmpIdx < cells.length) ? parseNum(cells[cmpIdx]) : null,
                cmpPct: (cmpPctIdx !== -1 && cmpPctIdx < cells.length) ? parseNum(cells[cmpPctIdx]) : null
              });
            }
          });
        }
      });

      if (peers.length === 0) {
        console.log(`[Sync] Cheerio peer parsing returned 0 peers for ${companyName}. Triggering AI Fallback...`);
        const tablesText = cleanTablesToText($peer);
        if (tablesText.trim().length > 0) {
          const schema = `{
            "peers": [
              {
                "peer_name": "string",
                "pe_ratio": number | null,
                "roe_pct": number | null,
                "revenue_cr": number | null
              }
            ]
          }`;
          const aiResult = await extractStructuredDataFromHtml<{ peers: IPOPlatformData["peers"] }>(
            tablesText,
            "peer comparison data (excluding the main target company itself, which is: " + companyName + ")",
            schema
          );
          if (aiResult && Array.isArray(aiResult.peers)) {
            console.log(`[Sync] AI Fallback successfully extracted ${aiResult.peers.length} peers for ${companyName}`);
            for (const p of aiResult.peers) {
              const peerCleaned = cleanNameForMatch(p.peer_name);
              if (!peerCleaned.includes(companyCleaned) && !companyCleaned.includes(peerCleaned)) {
                peers.push(p);
              }
            }
          }
        }
      }

      if (sectorPerformance.length === 0) {
        console.log(`[Sync] Cheerio sector performance returned 0 rows for ${companyName}. Triggering AI Fallback...`);
        const tablesText = cleanTablesToText($peer);
        if (tablesText.trim().length > 0) {
          const schema = `{
            "sectorPerformance": [
              {
                "name": "string",
                "offerPrice": number | null,
                "listingPrice": number | null,
                "listingGainPct": number | null,
                "cmp": number | null,
                "cmpPct": number | null
              }
            ]
          }`;
          const aiResult = await extractStructuredDataFromHtml<{ sectorPerformance: any[] }>(
            tablesText,
            "sector post-listing performance report table (listing offer price, listing price, listing gain %, cmp, cmp %)",
            schema
          );
          if (aiResult && Array.isArray(aiResult.sectorPerformance)) {
            console.log(`[Sync] AI Fallback successfully extracted ${aiResult.sectorPerformance.length} sector performance rows for ${companyName}`);
            sectorPerformance.push(...aiResult.sectorPerformance);
          }
        }
      }
    } catch (err: any) {
      console.error(`IPOPlatform: Peers scrape failed for ${companyName}:`, err.message);
    }
  }


  // 5. Scrape Anchor Investors
  const anchorInvestors: IPOPlatformData["anchorInvestors"] = [];
  if (!options?.onlySubscription) {
    try {
      const ancUrl = `https://www.ipoplatform.com/ipo/anchor-investor/${slug}/${id}`;
      const ancRes = await axios.get(ancUrl, { headers, timeout: 10000 });
      const $anc = load(ancRes.data);
      $anc("table").each((tblIdx, table) => {
        const headersRow: string[] = [];
        $anc(table).find("tr").first().find("th, td").each((i, cell) => {
          headersRow.push($anc(cell).text().trim().toLowerCase());
        });

        if (headersRow.includes("anchor investor name")) {
          $anc(table).find("tr").slice(1).each((trIdx, tr) => {
            const cells: string[] = [];
            $anc(tr).find("td").each((i, cell) => {
              cells.push($anc(cell).text().trim().replace(/\s+/g, " "));
            });

            if (cells.length >= 4) {
              const name = cells[0];
              const sharesAllotted = parseNum(cells[1]);
              const allocationPrice = parseNum(cells[2]);
              const amountVal = parseNum(cells[3]);
              const amountCr = amountVal ? amountVal / 10000000 : null;

              if (name) {
                anchorInvestors.push({
                  investor_name: name,
                  shares_allotted: sharesAllotted,
                  allocation_price: allocationPrice,
                  amount_cr: amountCr ? parseFloat(amountCr.toFixed(4)) : null,
                  investor_category: "Unknown",
                  scheme_name: null,
                  percent_of_anchor_book: null,
                  quality_tag: null,
                  is_marquee: false,
                  source: "ipoplatform",
                  source_url: ancUrl
                });
              }
            }
          });
        }
      });
    } catch (err) {
      // Normal for some pages to fail or not have anchor investor data
    }

    // AI Fallback for anchor investors
    if (anchorInvestors.length === 0) {
      try {
        const ancUrl = `https://www.ipoplatform.com/ipo/anchor-investor/${slug}/${id}`;
        const ancRes = await axios.get(ancUrl, { headers, timeout: 10000 });
        const $anc = load(ancRes.data);
        const tablesText = cleanTablesToText($anc);
        if (tablesText.trim().length > 0) {
          console.log(`[Sync] Cheerio anchor parsing returned 0 records for ${companyName}. Triggering AI Fallback...`);
          const schema = `{
            "anchorInvestors": [
              {
                "investor_name": "string",
                "shares_allotted": number | null,
                "allocation_price": number | null,
                "amount_cr": number | null
              }
            ]
          }`;
          const aiResult = await extractStructuredDataFromHtml<{ anchorInvestors: Array<any> }>(
            tablesText,
            "anchor investor allotment table",
            schema
          );
          if (aiResult && Array.isArray(aiResult.anchorInvestors)) {
            console.log(`[Sync] AI Fallback successfully extracted ${aiResult.anchorInvestors.length} anchors for ${companyName}`);
            for (const a of aiResult.anchorInvestors) {
              if (a.investor_name) {
                anchorInvestors.push({
                  investor_name: a.investor_name,
                  shares_allotted: a.shares_allotted,
                  allocation_price: a.allocation_price,
                  amount_cr: a.amount_cr,
                  investor_category: "Unknown",
                  scheme_name: null,
                  percent_of_anchor_book: null,
                  quality_tag: null,
                  is_marquee: false,
                  source: "ipoplatform",
                  source_url: ancUrl
                });
              }
            }
          }
        }
      } catch (err) {
        // Ignore fallback failures for anchors
      }
    }
  }

  // 6. Scrape Review Page (Lead Manager track record and review text)
  let reviewText: string | null = null;
  let leadManagerPerformance: IPOPlatformData["leadManagerPerformance"] = null;
  if (!options?.onlySubscription) {
    try {
      const reviewUrl = `https://www.ipoplatform.com/ipo/review/${slug}/${id}`;
      const revRes = await axios.get(reviewUrl, { headers, timeout: 10000 });
      const $rev = load(revRes.data);

      // Get the main review content
      let rawReviewText: string[] = [];
      $rev("p, div").each((i, el) => {
        const text = $rev(el).text().trim().replace(/\s+/g, " ");
        if (text.length > 50 && !text.includes("http") && !text.includes("Copyright") && !text.includes("Privacy Policy")) {
          rawReviewText.push(text);
        }
      });
      reviewText = rawReviewText.slice(0, 10).join("\n\n"); // Grab first few meaningful paragraphs for summary

      // Parse target company comparison metrics from the Review page comparison card
      $rev('div.overflowhidden.card').each((i, card) => {
        const isComparisonTable = $rev(card).find('.drhp-top-div').length > 0;
        if (!isComparisonTable) return;
        
        $rev(card).find('div.row').each((rIdx, row) => {
          const cells = $rev(row).find('div.col');
          if (cells.length >= 2) {
            const rowName = $rev(cells[0]).text().trim().toLowerCase();
            const rawVal = $rev(cells[1]).text().trim();
            
            if (rowName.includes("pe multiple") || rowName === "pe" || rowName.includes("p/e")) {
              peRatio = parseNum(rawVal);
            } else if (rowName.includes("ev/ebitda")) {
              evEbitda = parseNum(rawVal);
            } else if (rowName.includes("leverage")) {
              leverageRatio = parseNum(rawVal);
            }
          }
        });
      });

      // Parse rich peer data from the Review page select dropdown
      const companyCleaned = cleanNameForMatch(companyName);
      const dropdownPeers: IPOPlatformData["peers"] = [];
      $rev('select.ipo-select').first().find('option').each((i, el) => {
        const option = $rev(el);
        const val = option.val();
        if (!val) return; // Skip "Select the IPO"
        
        const rawName = option.text().trim();
        const peerName = rawName.replace(/\s+/g, " ").replace(/\b(ipo)\b/gi, "").trim();
        if (!peerName) return;

        const peerCleaned = cleanNameForMatch(peerName);
        // Skip if it is the company itself
        if (peerCleaned.includes(companyCleaned) || companyCleaned.includes(peerCleaned)) {
          return;
        }

        const patVal = option.attr('data-pat');
        const revVal = option.attr('data-annualisedrevenue');
        const peVal = option.attr('data-pe');
        const sizeVal = option.attr('data-size');
        const pat_margin = option.attr('data-pat_margin');
        const total_assets = option.attr('data-totalassets');
        const leverage_ratio = option.attr('data-totaldebt');
        const ev_ebitda = option.attr('data-evebitda');
        const brlm = option.attr('data-brlm');
        const listing_gains = option.attr('data-listing');
        const ipo_date = option.attr('data-date');
        const sectorAttr = option.attr('data-sector');
        const peerUrl = option.attr('data-url');

        const pat_cr = parseNum(patVal);
        const revenue_cr = parseNum(revVal);
        const pe_ratio = parseNum(peVal);
        const market_cap_cr = parseNum(sizeVal);

        const notesObj = {
          pat_margin_pct: pat_margin ? parseFloat(pat_margin) : null,
          leverage_ratio: leverage_ratio ? parseFloat(leverage_ratio) : null,
          ev_ebitda: ev_ebitda ? parseFloat(ev_ebitda) : null,
          brlm: brlm || null,
          ipo_size_cr: market_cap_cr,
          listing_gains: listing_gains || null,
          ipo_date: ipo_date || null,
          sector: sectorAttr || null,
          url: peerUrl || null,
          total_assets_cr: total_assets ? parseFloat(total_assets) : null,
        };

        dropdownPeers.push({
          peer_name: peerName,
          pe_ratio: pe_ratio,
          roe_pct: null,
          revenue_cr: revenue_cr,
          pat_cr: pat_cr,
          market_cap_cr: market_cap_cr,
          notes: JSON.stringify(notesObj)
        });
      });

      if (dropdownPeers.length > 0) {
        // Clear peers and replace with rich dropdown data
        peers.length = 0;
        peers.push(...dropdownPeers);
      }

      let lmParagraph = "";
      $rev("h3, h4, h5, h6, p, b, strong").each((i, el) => {
        const text = $rev(el).text().trim();
        if (text.includes("Track Record of") || text.includes("merchant Banker Report")) {
          const nextText = $rev(el).next().text().trim().replace(/\s+/g, " ");
          lmParagraph = nextText || text;
          return false; // Break
        }
      });

      if (!lmParagraph) {
        $rev("p, li, span, td").each((i, el) => {
          const text = $rev(el).text().trim().replace(/\s+/g, " ");
          if (text.includes("handled") && text.includes("SME IPO") && (text.includes("listing gains") || text.includes("listed"))) {
            lmParagraph = text;
            return false; // Break
          }
        });
      }

      if (lmParagraph) {
        console.log(`[Sync] Attempting deterministic regex parsing for Lead Manager performance on ${companyName}...`);
        const parsedLM = parseLeadManagerPerformance(lmParagraph);
        
        // If we parsed name, totalIpos, and successRatePct successfully, use it!
        if (parsedLM && parsedLM.name && parsedLM.totalIpos !== null && parsedLM.successRatePct !== null) {
          console.log(`[Sync] Deterministic regex parser succeeded for ${companyName}:`, parsedLM);
          leadManagerPerformance = parsedLM;
        } else {
          console.log(`[Sync] Deterministic parser incomplete (Name: ${parsedLM?.name}, totalIpos: ${parsedLM?.totalIpos}, successRate: ${parsedLM?.successRatePct}). Triggering AI Fallback...`);
          // Use AI fallback to extract structured BRLM performance
          const schema = `{
            "name": "string (Lead Manager Name, e.g. GYR Capital Advisors Private Limited)",
            "city": "string | null (city of operation if mentioned)",
            "totalIpos": number | null (number of IPOs managed/handled)",
            "successRatePct": number | null (percentage listed with gains)",
            "description": "string | null (full source paragraph or summary)"
          }`;
          try {
            const aiResult = await extractStructuredDataFromHtml<{
              name: string | null;
              city: string | null;
              totalIpos: number | null;
              successRatePct: number | null;
              description: string | null;
            }>(
              lmParagraph,
              "Lead Manager merchant banker track record stats",
              schema
            );
            if (aiResult) {
              leadManagerPerformance = aiResult;
            }
          } catch (aiErr: any) {
            console.error(`[Sync] Groq AI fallback failed for ${companyName} Lead Manager stats:`, aiErr.message);
            // If Groq fails but we had some partial regex results, use them as a fallback!
            if (parsedLM) {
              console.log(`[Sync] Using partial regex result as fallback for ${companyName} Lead Manager stats:`, parsedLM);
              leadManagerPerformance = parsedLM;
            }
          }
        }
      }
    } catch (err) {
      console.error(`IPOPlatform: Review page scrape failed for ${companyName}:`, err);
    }
  }

  return {
    leadManager,
    financials,
    peers,
    subscription,
    anchorInvestors,
    url,
    reviewText,
    leadManagerPerformance,
    sectorPerformance,
    sector,
    subSector,
    companyOverview,
    peRatio,
    evEbitda,
    leverageRatio,
    registrar
  };
}
