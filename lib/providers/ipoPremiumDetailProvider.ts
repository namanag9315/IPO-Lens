import * as cheerio from 'cheerio';
import { extractTableMatrices, TableMatrix } from './debugExtractTables';
import { parseIPOPremiumFromText, TextFallbackData } from './ipoPremiumTextFallbackParser';

export interface IPODetailParsedData extends TextFallbackData {
  _debugTableMatrices?: TableMatrix[];
  summary?: {
    priceBand?: string;
    gmp?: string;
    lotSize?: string;
    issueSize?: string;
    allotmentDate?: string;
    listingDate?: string;
  };
  subscription?: {
    lastUpdated?: string;
    rows: Array<{
      category: string;
      offered: number | null;
      applied: number | null;
      times: number | null;
    }>;
  };
  applicationBreakup?: Array<{
    category: string;
    reserved: number | null;
    applied: number | null;
    times: number | null;
  }>;
  lotDistribution?: Array<{
    category: string;
    lots: number | null;
    quantity: number | null;
    amount: number | null;
    reserved: number | null;
  }>;
  reservation?: Array<{
    category: string;
    sharesOffered: number | null;
    percentage: number | null;
  }>;
  ipoDetails?: {
    totalIssueSize?: number | null;
    freshIssue?: number | null;
    offerForSale?: number | null;
    faceValue?: number | null;
    issueType?: string;
    listingAt?: string;
    preIssueShares?: number | null;
    postIssueShares?: number | null;
    marketMakerReservedShares?: number | null;
    marketMakerReservedAmount?: number | null;
    marketMakerName?: string;
  };
  kpis?: Array<{
    name: string;
    periods: Record<string, string>;
  }>;
  financials?: Array<{
    period: string;
    assets: number | null;
    totalIncome: number | null;
    pat: number | null;
    ebitda: number | null;
    netWorth: number | null;
    reserves: number | null;
    borrowings: number | null;
  }>;
  peerValuation?: Array<{
    company: string;
    pe: number | null;
    cmp: number | null;
    faceValue: number | null;
    ronw: number | null;
    epsBasic: number | null;
  }>;
  peerFinancials?: Array<{
    company: string;
    ronw: number | null;
    epsBasic: number | null;
  }>;
  strengths?: Array<{
    title: string;
    description: string;
  }>;
  risks?: Array<{
    title: string;
    description: string;
    severity: string;
  }>;
}

type TableClassification =
  | "subscription"
  | "application_breakup"
  | "lot_distribution"
  | "reservation"
  | "ipo_details"
  | "kpi"
  | "financials"
  | "peer_valuation"
  | "peer_financials"
  | "unknown";

function cleanNumericValue(val: string): number | null {
  if (!val || val.trim() === '' || val.trim() === '-') return null;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function classifyIPOPremiumTable(table: TableMatrix): TableClassification {
  const headerStr = table.headers.join(' ').toLowerCase();
  const nearbyStr = (table.nearbyHeading || '').toLowerCase();
  const firstColStr = table.rows.map(r => (r[0] || '').toLowerCase()).join(' ');
  const fullText = headerStr + ' ' + table.rows.map(r => r.join(' ').toLowerCase()).join(' ');

  // 1. Subscription
  if (headerStr.includes('category') && headerStr.includes('offered') && headerStr.includes('applied') && headerStr.includes('times')) {
    return "subscription";
  }

  // 2. Application Breakup
  if (headerStr.includes('category') && headerStr.includes('reserved') && headerStr.includes('applied') && headerStr.includes('times')) {
    if (nearbyStr.includes('application-wise') || nearbyStr.includes('application wise')) return "application_breakup";
    return "application_breakup"; // Sometimes heading misses
  }

  // 3. Lot Distribution
  if (headerStr.includes('category') && headerStr.includes('lot') && headerStr.includes('qty') && (headerStr.includes('amount') || headerStr.includes('reserved'))) {
    return "lot_distribution";
  }
  if (nearbyStr.includes('lot(s) distribution') || nearbyStr.includes('lot distribution')) {
    return "lot_distribution";
  }

  // 4. Reservation
  if (headerStr.includes('category') && (headerStr.includes('shares offered') || headerStr.includes('%'))) {
    if (nearbyStr.includes('reservation')) return "reservation";
  }

  // 5. IPO Details
  if (table.columnCount === 2) {
    if (
      firstColStr.includes('issue size') ||
      firstColStr.includes('fresh issue') ||
      firstColStr.includes('offer for sale') ||
      firstColStr.includes('face value') ||
      firstColStr.includes('issue type') ||
      firstColStr.includes('listing at') ||
      firstColStr.includes('market maker')
    ) {
      return "ipo_details";
    }
  }

  // 6. KPIs
  if (headerStr.includes('kpi') || firstColStr.includes('roe') || firstColStr.includes('roce') || firstColStr.includes('eps')) {
    // If it has periods like Mar-26, Mar-25 or just looks like KPI
    if (nearbyStr.includes('key performance') || nearbyStr.includes('kpi')) return "kpi";
    if (fullText.includes('roe') && fullText.includes('roce')) return "kpi";
  }

  // 7. Financials
  if (nearbyStr.includes('company financial') || nearbyStr.includes('financials')) {
    return "financials";
  }
  if (firstColStr.includes('assets') || firstColStr.includes('total income') || firstColStr.includes('profit after tax') || firstColStr.includes('ebitda') || firstColStr.includes('net worth') || firstColStr.includes('reserves') || firstColStr.includes('borrowing')) {
    return "financials";
  }

  // 8. Peer Valuation
  if (nearbyStr.includes('peer comparison') && nearbyStr.includes('valuation')) return "peer_valuation";
  if (headerStr.includes('company') && (headerStr.includes('p/e') || headerStr.includes('pe')) && headerStr.includes('cmp') && headerStr.includes('face value')) {
    return "peer_valuation";
  }
  if (nearbyStr.includes('peer comparison') && !nearbyStr.includes('financial')) return "peer_valuation";

  // 9. Peer Financials
  if (nearbyStr.includes('peer comparison') && nearbyStr.includes('financial')) return "peer_financials";
  if (headerStr.includes('company') && (headerStr.includes('ronw') || headerStr.includes('eps'))) {
    return "peer_financials";
  }

  return "unknown";
}

export function parseIPOPremiumDetailPage({
  html,
}: {
  ipoId?: string;
  sourceUrl?: string;
  html: string;
}): IPODetailParsedData {
  const $ = cheerio.load(html);
  const data: IPODetailParsedData = {};

  // 1. Extract matrices
  const matrices = extractTableMatrices($);
  data._debugTableMatrices = matrices;

  // 2. Parse from tables
  matrices.forEach(table => {
    const type = classifyIPOPremiumTable(table);

    if (type === "subscription") {
      data.subscription = { rows: [] };
      table.rows.forEach(row => {
        if (row.length >= 4 && !row[0].toLowerCase().includes('category')) {
          data.subscription!.rows.push({
            category: row[0],
            offered: cleanNumericValue(row[1]),
            applied: cleanNumericValue(row[2]),
            times: cleanNumericValue(row[3])
          });
        }
      });
    } else if (type === "application_breakup") {
      data.applicationBreakup = [];
      table.rows.forEach(row => {
        if (row.length >= 4 && !row[0].toLowerCase().includes('category')) {
          data.applicationBreakup!.push({
            category: row[0],
            reserved: cleanNumericValue(row[1]),
            applied: cleanNumericValue(row[2]),
            times: cleanNumericValue(row[3])
          });
        }
      });
    } else if (type === "lot_distribution") {
      data.lotDistribution = [];
      table.rows.forEach(row => {
        if (row.length >= 5 && !row[0].toLowerCase().includes('category')) {
          data.lotDistribution!.push({
            category: row[0],
            lots: cleanNumericValue(row[1]),
            quantity: cleanNumericValue(row[2]),
            amount: cleanNumericValue(row[3]),
            reserved: cleanNumericValue(row[4])
          });
        }
      });
    } else if (type === "reservation") {
      data.reservation = [];
      table.rows.forEach(row => {
        if (row.length >= 3 && !row[0].toLowerCase().includes('category')) {
          data.reservation!.push({
            category: row[0],
            sharesOffered: cleanNumericValue(row[1]),
            percentage: cleanNumericValue(row[2])
          });
        }
      });
    } else if (type === "ipo_details") {
      if (!data.ipoDetails) data.ipoDetails = {};
      table.rows.forEach(row => {
        if (row.length >= 2) {
          const key = row[0].toLowerCase();
          const val = row[1];
          const numVal = cleanNumericValue(val);

          if (key.includes('total issue size')) data.ipoDetails!.totalIssueSize = numVal;
          else if (key.includes('fresh issue')) data.ipoDetails!.freshIssue = numVal;
          else if (key.includes('offer for sale')) data.ipoDetails!.offerForSale = numVal;
          else if (key.includes('face value')) data.ipoDetails!.faceValue = numVal;
          else if (key.includes('issue type')) data.ipoDetails!.issueType = val;
          else if (key.includes('listing at')) data.ipoDetails!.listingAt = val;
          else if (key.includes('pre-issue shares') || key.includes('pre issue shares')) data.ipoDetails!.preIssueShares = numVal;
          else if (key.includes('post-issue shares') || key.includes('post issue shares')) data.ipoDetails!.postIssueShares = numVal;
          else if (key.includes('market maker')) {
             if (val.toLowerCase().includes('shares')) {
               data.ipoDetails!.marketMakerReservedShares = numVal;
             } else if (val.includes('₹') || val.includes('Cr') || val.includes('Lakh')) {
               data.ipoDetails!.marketMakerReservedAmount = numVal;
             } else {
               data.ipoDetails!.marketMakerName = val;
             }
          }
        }
      });
    } else if (type === "kpi") {
      data.kpis = [];
      const hdrs = table.headers;
      table.rows.forEach(row => {
        if (row.length >= 2 && !row[0].toLowerCase().includes('kpi')) {
          const name = row[0];
          const periods: Record<string, string> = {};
          for (let i = 1; i < row.length; i++) {
            if (hdrs[i]) {
              periods[hdrs[i]] = row[i];
            }
          }
          data.kpis!.push({ name, periods });
        }
      });
    } else if (type === "financials") {
      data.financials = [];
      const hdrs = table.headers.map(h => h.toLowerCase());
      // Handle transposed financials (columns are periods) or standard (rows are periods)
      // Usually rows are periods, but sometimes columns are periods.
      // If header contains periods (like Mar-24), columns are periods.
      // Wait, standard parse: column 0 is period label, columns 1+ are metrics.
      // If header 0 is 'period', then standard.
      // But if header 0 is 'assets' or empty, and headers 1+ are periods, it's transposed.
      const isTransposed = hdrs.some(h => h.match(/mar-\d\d/i) || h.match(/dec-\d\d/i));

      if (!isTransposed) {
        table.rows.forEach(row => {
          if (row.length >= 2) {
            const period = row[0];
            // Skip if it's the header row repeated
            if (period.toLowerCase().includes('period')) return;

            const f: any = { period };
            for(let i = 1; i < row.length; i++) {
              const val = cleanNumericValue(row[i]);
              const h = hdrs[i] || '';
              if (h.includes('asset')) f.assets = val;
              else if (h.includes('income') || h.includes('revenue')) f.totalIncome = val;
              else if (h.includes('pat') || h.includes('profit')) f.pat = val;
              else if (h.includes('ebitda')) f.ebitda = val;
              else if (h.includes('net worth')) f.netWorth = val;
              else if (h.includes('reserve')) f.reserves = val;
              else if (h.includes('borrowing')) f.borrowings = val;
            }
            data.financials!.push(f);
          }
        });
      } else {
         // Transposed
         const periods = table.headers.slice(1);
         periods.forEach((p, idx) => {
           if (!p) return;
           const f: any = { period: p };
           table.rows.forEach(row => {
             const key = row[0].toLowerCase();
             const val = cleanNumericValue(row[idx + 1]);
             if (key.includes('asset')) f.assets = val;
             else if (key.includes('income') || key.includes('revenue')) f.totalIncome = val;
             else if (key.includes('pat') || key.includes('profit')) f.pat = val;
             else if (key.includes('ebitda')) f.ebitda = val;
             else if (key.includes('net worth')) f.netWorth = val;
             else if (key.includes('reserve')) f.reserves = val;
             else if (key.includes('borrowing')) f.borrowings = val;
           });
           data.financials!.push(f);
         });
      }
    } else if (type === "peer_valuation") {
      data.peerValuation = [];
      const hdrs = table.headers.map(h => h.toLowerCase());
      table.rows.forEach(row => {
        if (row.length >= 2 && !row[0].toLowerCase().includes('company')) {
          const p: any = { company: row[0] };
          for(let i=1; i<row.length; i++){
            const val = cleanNumericValue(row[i]);
            const h = hdrs[i] || '';
            if (h.includes('p/e') || h.includes('pe')) p.pe = val;
            else if (h.includes('cmp')) p.cmp = val;
            else if (h.includes('face value')) p.faceValue = val;
            else if (h.includes('ronw') || h.includes('roe')) p.ronw = val;
            else if (h.includes('eps')) p.epsBasic = val;
          }
          data.peerValuation!.push(p);
        }
      });
    }
  });

  // Strengths and Risks are typically list elements, parse from HTML
  $('h2, h3').each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text.includes('strength')) {
      data.strengths = [];
      const list = $(el).nextAll('ul').first();
      if (list.length) {
        list.find('li').each((_, li) => {
          const strong = $(li).find('strong').text().trim();
          const desc = $(li).text().replace(strong, '').trim();
          data.strengths!.push({ title: strong || 'Strength', description: desc });
        });
      }
    } else if (text.includes('risk factor')) {
      data.risks = [];
      const list = $(el).nextAll('ul').first();
      if (list.length) {
        list.find('li').each((_, li) => {
          const strong = $(li).find('strong').text().trim();
          const rawText = $(li).text();
          let severity = 'Medium';
          if (rawText.toLowerCase().includes('high severity')) severity = 'High';
          if (rawText.toLowerCase().includes('low severity')) severity = 'Low';

          const desc = rawText.replace(strong, '').replace(/\(High Severity\)|\(Medium Severity\)|\(Low Severity\)/ig, '').trim();
          data.risks!.push({ title: strong || 'Risk', description: desc, severity });
        });
      }
    }
  });

  // 3. Fallback to Text Parsing
  const rawText = $('body').text().split('\n').map(line => line.trim()).filter(Boolean).join('\n');
  const fallbackData = parseIPOPremiumFromText(rawText);

  if (fallbackData.companyProfile) data.companyProfile = fallbackData.companyProfile;
  if (fallbackData.leadManager && !data.leadManager) data.leadManager = fallbackData.leadManager;
  if (fallbackData.registrar && !data.registrar) data.registrar = fallbackData.registrar;

  if (fallbackData.marketMaker) {
    if (!data.ipoDetails) data.ipoDetails = {};
    if (fallbackData.marketMaker.name) data.ipoDetails.marketMakerName = fallbackData.marketMaker.name;
    if (fallbackData.marketMaker.reservedShares) data.ipoDetails.marketMakerReservedShares = fallbackData.marketMaker.reservedShares;
    if (fallbackData.marketMaker.reservedAmount) data.ipoDetails.marketMakerReservedAmount = fallbackData.marketMaker.reservedAmount;
  }

  // 4. Fail Loudly
  let sectionCount = 0;
  if (data.subscription?.rows?.length) sectionCount++;
  if (data.ipoDetails && Object.keys(data.ipoDetails).length) sectionCount++;
  if (data.financials?.length) sectionCount++;
  if (data.companyProfile?.description) sectionCount++;
  if (data.peerValuation?.length) sectionCount++;
  if (data.leadManager?.name) sectionCount++;
  if (data.registrar?.name) sectionCount++;

  if (sectionCount < 3) {
    throw new Error(`IPO Premium parser found too few sections (${sectionCount}). Check fetched HTML and table matrices.`);
  }

  return data;
}
