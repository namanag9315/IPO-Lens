import * as fs from "fs";
import * as path from "path";
import { load } from "cheerio";

function parseNum(val: string | null | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(/,/g, "").replace(/[^\d.-]/g, "").trim();
  if (cleaned === "" || cleaned === "-" || cleaned.includes("●")) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function cleanNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(limited|ltd|ipo|fpo|india|limited-ipo|ltd-ipo|private|pvt|corp|corporation)\b/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

function main() {
  const mainPath = path.join(process.cwd(), "scratch", "liotech_main.html");
  const revPath = path.join(process.cwd(), "scratch", "liotech_review.html");

  if (!fs.existsSync(mainPath) || !fs.existsSync(revPath)) {
    console.error("Test HTML files not found!");
    return;
  }

  const $main = load(fs.readFileSync(mainPath, "utf-8"));
  const $rev = load(fs.readFileSync(revPath, "utf-8"));

  // 1. Sector
  let sector: string | null = null;
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

  // 2. Sub Sector
  let subSector: string | null = null;
  $main('h5').each((i, el) => {
    const text = $main(el).text().trim();
    if (text.toLowerCase().includes("sub sector")) {
      subSector = $main(el).find('b.brand-primary').text().trim() || text.replace(/sub sector\s*:\s*/i, "").trim();
      return false;
    }
  });

  // 3. Company Overview
  let companyOverview: string | null = null;
  const previewEl = $main('#company-info-preview');
  if (previewEl.length > 0) {
    companyOverview = previewEl.text().trim().replace(/\s+/g, " ");
  } else {
    const fullEl = $main('#company-info-full');
    if (fullEl.length > 0) {
      companyOverview = fullEl.text().trim().replace(/\s+/g, " ");
    }
  }

  console.log("--- MAIN PAGE METADATA ---");
  console.log("Sector:", sector);
  console.log("Sub-Sector:", subSector);
  console.log("Company Overview (first 200 chars):", companyOverview?.substring(0, 200));

  // 4. Peer Dropdown Options & Target Company PE
  const peers: any[] = [];
  const companyCleaned = cleanNameForMatch("Liotech Industries");

  $rev('select.ipo-select').first().find('option').each((i, el) => {
    const option = $rev(el);
    const val = option.val();
    if (!val) return; // Skip "Select the IPO"
    
    const rawName = option.text().trim();
    const peerName = rawName.replace(/\s+/g, " ").replace(/\b(ipo)\b/gi, "").trim();
    if (!peerName) return;

    const peerCleaned = cleanNameForMatch(peerName);
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

    peers.push({
      peer_name: peerName,
      pe_ratio: pe_ratio,
      roe_pct: null,
      revenue_cr: revenue_cr,
      pat_cr: pat_cr,
      market_cap_cr: market_cap_cr,
      notes: JSON.stringify(notesObj)
    });
  });

  console.log("\n--- PEERS FROM DROPDOWN ---");
  console.log("Total Peers found:", peers.length);
  if (peers.length > 0) {
    console.log("Sample Peer:", peers[0]);
  }

  // Target Company details from table
  let targetPE: number | null = null;
  let targetEV_EBITDA: number | null = null;
  let targetLeverage: number | null = null;

  $rev('div.overflowhidden.card').each((i, card) => {
    const isComparisonTable = $rev(card).find('.drhp-top-div').length > 0;
    if (!isComparisonTable) return;
    
    $rev(card).find('div.row').each((rIdx, row) => {
      const cells = $rev(row).find('div.col');
      if (cells.length >= 2) {
        const rowName = $rev(cells[0]).text().trim().toLowerCase();
        const rawVal = $rev(cells[1]).text().trim();
        
        if (rowName.includes("pe multiple") || rowName === "pe" || rowName.includes("p/e")) {
          targetPE = parseNum(rawVal);
        } else if (rowName.includes("ev/ebitda")) {
          targetEV_EBITDA = parseNum(rawVal);
        } else if (rowName.includes("leverage")) {
          targetLeverage = parseNum(rawVal);
        }
      }
    });
  });

  console.log("\n--- TARGET COMPANY METRICS ---");
  console.log("Target PE:", targetPE);
  console.log("Target EV/EBITDA:", targetEV_EBITDA);
  console.log("Target Leverage Ratio:", targetLeverage);
}

main();
