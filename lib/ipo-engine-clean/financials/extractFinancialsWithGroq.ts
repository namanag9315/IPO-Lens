import * as cheerio from "cheerio";
import Groq from "groq-sdk";
import { scoreIPONameCandidate } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { normalizeFinancialTable, parseFinancialNumber } from "@/lib/ipo-engine-clean/financials/normalizeFinancialTable";
import type { FactCandidate } from "@/lib/ipo-engine-clean/types";

type FinancialUnit = "crore" | "lakh" | "million" | "thousand" | "unknown";

type AIRow = {
  borrowings?: number | string | null;
  debtEquity?: number | string | null;
  ebitda?: number | string | null;
  ebitdaMargin?: number | string | null;
  eps?: number | string | null;
  netWorth?: number | string | null;
  pat?: number | string | null;
  patMargin?: number | string | null;
  period?: string | null;
  reserves?: number | string | null;
  revenue?: number | string | null;
  roce?: number | string | null;
  roe?: number | string | null;
  totalAssets?: number | string | null;
  totalIncome?: number | string | null;
};

type AIResponse = {
  matchedCompany?: boolean;
  sourceCompanyName?: string | null;
  unit?: FinancialUnit;
  rows?: AIRow[];
  dataQualityNote?: string | null;
};

export interface GroqFinancialExtractionResult {
  fact: FactCandidate | null;
  identityScore: number;
  unit: FinancialUnit;
  warnings: string[];
}

function parseJsonOnly(content: string) {
  return JSON.parse(content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim()) as AIResponse;
}

function tableLooksFinancial(text: string) {
  return [/revenue|total income|sales/i, /profit after tax|\bpat\b|net profit/i, /ebitda/i, /assets|net worth|borrowings|debt/i]
    .filter((pattern) => pattern.test(text)).length >= 2;
}

export function buildFinancialEvidenceExcerpt(html: string) {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,form").remove();
  const identity = [
    $("title").first().text(),
    $("meta[property='og:title']").attr("content") ?? "",
    ...$("h1").slice(0, 3).map((_, element) => $(element).text()).get(),
  ].map((value) => value.replace(/\s+/g, " ").trim()).filter(Boolean);
  const sections: string[] = [];

  $("table").each((_, table) => {
    const text = $(table).text().replace(/\s+/g, " ").trim();
    if (!tableLooksFinancial(text)) return;
    const heading = $(table).prevAll("h1,h2,h3,h4,h5,strong").first().text().replace(/\s+/g, " ").trim();
    sections.push(`${heading ? `${heading}\n` : ""}${text}`);
  });

  if (sections.length === 0) {
    const body = $("body").text().replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
    const lower = body.toLowerCase();
    for (const marker of ["financial highlights", "financial performance", "company financials", "restated financial", "revenue"]) {
      const index = lower.indexOf(marker);
      if (index >= 0) sections.push(body.slice(Math.max(0, index - 300), index + 6000));
    }
  }

  return [`IDENTITY\n${identity.join("\n")}`, ...sections]
    .join("\n\nFINANCIAL SOURCE SECTION\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 22_000);
}

function numericToken(value: unknown) {
  const parsed = parseFinancialNumber(value);
  if (parsed === null) return null;
  return String(Number(parsed.toFixed(4)));
}

function sourceNumericTokens(excerpt: string) {
  const values = excerpt.match(/(?:\(?-?\d[\d,]*(?:\.\d+)?\)?)/g) ?? [];
  return new Set(values.map(numericToken).filter((value): value is string => Boolean(value)));
}

function rowHasEvidence(row: AIRow, tokens: Set<string>, excerpt: string) {
  const period = String(row.period ?? "").replace(/\s+/g, " ").trim();
  if (!period || !excerpt.toLowerCase().includes(period.toLowerCase())) return false;
  const values = [row.revenue, row.totalIncome, row.pat, row.ebitda, row.netWorth, row.reserves, row.totalAssets, row.borrowings]
    .map(numericToken)
    .filter((value): value is string => Boolean(value));
  return values.filter((value) => tokens.has(value)).length >= 2;
}

function standardizedRows(rows: AIRow[]) {
  return rows.slice(0, 8).map((row) => ({
    financial_year: row.period,
    revenue_cr: row.revenue,
    pat_cr: row.pat,
    ebitda_cr: row.ebitda,
    net_worth_cr: row.netWorth,
    total_assets_cr: row.totalAssets,
    total_income_cr: row.totalIncome,
    reserves_cr: row.reserves,
    total_borrowings_cr: row.borrowings,
    eps: row.eps,
    roe_pct: row.roe,
    roce_pct: row.roce,
    debt_equity: row.debtEquity,
    pat_margin_pct: row.patMargin,
    ebitda_margin_pct: row.ebitdaMargin,
  }));
}

export function isGroqFinancialFallbackEnabled() {
  return Boolean(process.env.GROQ_API_KEY) && process.env.ENABLE_AI_FINANCIAL_FALLBACK !== "false";
}

export async function extractFinancialsWithGroq({
  html,
  ipoName,
  sourceProvider,
  sourceUrl,
}: {
  html: string;
  ipoName: string;
  sourceProvider: string;
  sourceUrl: string;
}): Promise<GroqFinancialExtractionResult> {
  const warnings: string[] = [];
  const excerpt = buildFinancialEvidenceExcerpt(html);
  if (!tableLooksFinancial(excerpt)) {
    return { fact: null, identityScore: 0, unit: "unknown", warnings: ["AI fallback skipped: source has insufficient financial evidence."] };
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 1800,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a strict financial table transcription engine. Use only the supplied source excerpt. Do not use memory, outside knowledge, estimates, annualisation, interpolation, or arithmetic to invent missing values. Preserve the source unit. Return valid JSON only.",
      },
      {
        role: "user",
    content: `Target IPO: ${ipoName}\nSource provider: ${sourceProvider}\nSource URL: ${sourceUrl}\n\nFirst verify that the source is about the target issuer. Then transcribe only explicitly printed financial table values. Keep revenue from operations and total income separate. Return exactly this JSON shape:\n{\n  "matchedCompany": true or false,\n  "sourceCompanyName": "issuer name printed by source or null",\n  "unit": "crore" | "lakh" | "million" | "thousand" | "unknown",\n  "rows": [{\n    "period": "period exactly as printed",\n    "revenue": number|null,\n    "totalIncome": number|null,\n    "pat": number|null,\n    "ebitda": number|null,\n    "netWorth": number|null,\n    "reserves": number|null,\n    "totalAssets": number|null,\n    "borrowings": number|null,\n    "eps": number|null,\n    "roe": number|null,\n    "roce": number|null,\n    "debtEquity": number|null,\n    "patMargin": number|null,\n    "ebitdaMargin": number|null\n  }],\n  "dataQualityNote": "short factual note"\n}\nIf the issuer identity, unit, period, or figures are not explicit, return no rows rather than guessing.\n\nSOURCE EXCERPT:\n${excerpt}`,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return { fact: null, identityScore: 0, unit: "unknown", warnings: ["AI fallback returned no content."] };

  const parsed = parseJsonOnly(content);
  const sourceCompanyName = typeof parsed.sourceCompanyName === "string" ? parsed.sourceCompanyName : "";
  const identityScore = scoreIPONameCandidate(ipoName, sourceCompanyName).score;
  if (parsed.matchedCompany !== true || identityScore < 82) {
    return { fact: null, identityScore, unit: "unknown", warnings: [`AI fallback rejected source identity at score ${identityScore}.`] };
  }

  const unit: FinancialUnit = ["crore", "lakh", "million", "thousand", "unknown"].includes(String(parsed.unit))
    ? (parsed.unit as FinancialUnit)
    : "unknown";
  if (unit === "unknown") {
    return { fact: null, identityScore, unit, warnings: ["AI fallback rejected financials because the source unit was not explicit."] };
  }

  const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
  const tokens = sourceNumericTokens(excerpt);
  const evidencedRows = rows.filter((row) => row && typeof row === "object" && rowHasEvidence(row, tokens, excerpt));
  if (evidencedRows.length !== rows.length) warnings.push(`${rows.length - evidencedRows.length} AI row(s) were rejected because their figures were not found in the source excerpt.`);

  const standardized = standardizedRows(evidencedRows);
  const normalized = normalizeFinancialTable(standardized, { unit });
  warnings.push(...normalized.warnings);
  if (normalized.rows.length === 0) {
    return { fact: null, identityScore, unit, warnings: [...warnings, "AI fallback produced no validated financial rows."] };
  }

  return {
    fact: {
      confidence: "medium",
      displayValue: `${normalized.rows.length} evidence-checked financial period(s) from ${sourceProvider}`,
      factKey: "financial_table",
      factValue: normalized.rows,
      sourceEvidence: `AI transcription constrained to ${sourceUrl}; source unit ${unit}; ${normalized.rows.length} row(s) passed numeric evidence checks and were normalized to ₹ crore.`,
    },
    identityScore,
    unit: "crore",
    warnings,
  };
}
