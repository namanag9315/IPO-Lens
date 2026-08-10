import * as cheerio from "cheerio";
import { extractTablesAndText } from "@/lib/ipo-engine-clean/extractTablesAndText";
import type { FactCandidate } from "@/lib/ipo-engine-clean/types";
import { parseIssueSizeCr } from "@/lib/ipo-engine-clean/providers/chittorgarhProvider";

function cleanValue(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function fact(
  factKey: string,
  factValue: unknown,
  confidence: FactCandidate["confidence"] = "medium",
  displayValue?: string | null,
  sourceEvidence?: string | null
): FactCandidate {
  return {
    confidence,
    displayValue: displayValue ?? (typeof factValue === "string" ? factValue : undefined),
    factKey,
    factValue,
    sourceEvidence,
  };
}

export function parseIPOWatchReview(html: string, ipoName: string) {
  const $ = cheerio.load(html);
  const extracted = extractTablesAndText(html);
  const facts: FactCandidate[] = [];
  const warnings: string[] = [];

  // Helper to check for patterns
  const hasAny = (text: string, patterns: RegExp[]) => patterns.some((p) => p.test(text));

  // 1. Extract 3-year Financial table
  const finTable = extracted.tables.find((table) => {
    const text = `${table.nearbyHeading} ${table.headers.join(" ")} ${table.rowText.join(" ")}`.toLowerCase();
    const isKpi = hasAny(text, [/\bkpi\b/, /\broe\b/, /\broce\b/, /debt\/?equity/, /ronw/, /\beps\b/, /\bp\/?e\b/, /\bnav\b/]) && !hasAny(text, [/peer|comparison/]);
    return !isKpi && hasAny(text, [/financial information/, /company financials/, /restated financials/, /assets/, /revenue/, /total income/, /profit after tax/, /\bpat\b/, /net worth/]);
  });
  if (finTable) {
    facts.push(fact("financial_table", finTable.rows, "high", `Financial table with ${finTable.rows.length} rows`));
  }

  // 2. Risk factors list
  const risks: string[] = [];
  $("h2, h3, h4, strong").each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (/risk|negative|drawback/i.test(text) && text.length < 100) {
      let next = $(el).next();
      if (next.is("ul, ol")) {
        next.find("li").each((_, li) => {
          const rText = $(li).text().trim();
          if (rText.length > 10) risks.push(rText);
        });
      } else {
        let depth = 0;
        while (next.length && depth < 5) {
          if (next.is("h1, h2, h3, h4, h5, h6")) break;
          const rText = next.text().trim();
          if (rText.length > 20) risks.push(rText);
          next = next.next();
          depth++;
        }
      }
    }
  });
  if (risks.length > 0) {
    facts.push(fact("risks", risks, "medium"));
  }

  // 3. Analyst recommendation text
  let recommendation: string | null = null;
  $("h2, h3, h4, strong").each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (/recommendation|verdict|subscribe or not|should you subscribe/i.test(text) && text.length < 100) {
      let next = $(el).next();
      const pText = next.text().trim();
      if (pText.length > 20) {
        recommendation = pText;
      }
    }
  });
  if (recommendation) {
    facts.push(fact("ipo_review_summary", recommendation, "medium"));
  }

  // 4. Mentioned peer companies & sectorPEAvg
  const peerTable = extracted.tables.find((table) => {
    const text = `${table.nearbyHeading} ${table.headers.join(" ")} ${table.rowText.join(" ")}`.toLowerCase();
    return hasAny(text, [/peer/, /comparison/, /company/]) && hasAny(text, [/p\/?e/, /eps/, /roe/, /ronw/, /cmp/]) && table.rows.length >= 1;
  });
  if (peerTable) {
    facts.push(fact("peer_valuation_table", peerTable.rows, "high", `Peer table with ${peerTable.rows.length} rows`));

    const peerPEsForAvg: number[] = [];
    peerTable.rows.forEach((row, index) => {
      if (index === 0) return; // exclude target company
      const peKeys = Object.keys(row).filter(k => /p\/?e|pe ratio|ratio/i.test(k));
      let peVal: number | null = null;
      for (const key of peKeys) {
        peVal = parseIssueSizeCr(row[key]);
        if (peVal !== null) break;
      }
      if (peVal !== null && peVal > 0) {
        peerPEsForAvg.push(peVal);
      }
    });
    if (peerPEsForAvg.length > 0) {
      const avg = peerPEsForAvg.reduce((a, b) => a + b, 0) / peerPEsForAvg.length;
      facts.push(fact("sectorPEAvg", Number(avg.toFixed(2)), "high"));
    }
  }

  return { facts, warnings, debug: {} };
}
