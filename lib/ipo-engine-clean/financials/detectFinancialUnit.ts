import * as cheerio from "cheerio";
import { parseFinancialNumber } from "@/lib/ipo-engine-clean/financials/normalizeFinancialTable";

export type DetectedFinancialUnit = "crore" | "lakh" | "million" | "thousand";

export interface FinancialUnitDetection {
  evidence: string;
  unit: DetectedFinancialUnit | null;
}

function unitFromLabel(label: string): DetectedFinancialUnit | null {
  if (/^(?:cr\.?|crores?)$/i.test(label)) return "crore";
  if (/^(?:lakhs?|lacs?)$/i.test(label)) return "lakh";
  if (/^(?:millions?|mn)$/i.test(label)) return "million";
  if (/^(?:thousands?|000s)$/i.test(label)) return "thousand";
  return null;
}

function numericToken(value: unknown) {
  const parsed = parseFinancialNumber(value);
  return parsed === null ? null : String(Number(parsed.toFixed(4)));
}

function collectTableNumbers(value: unknown, output = new Set<string>()) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectTableNumbers(item, output));
    return output;
  }
  if (value && typeof value === "object") {
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (!/year|period|date/i.test(key)) collectTableNumbers(item, output);
    });
    return output;
  }
  const token = numericToken(value);
  if (token) output.add(token);
  return output;
}

export function detectFinancialUnitFromHTML(html: string, financialTable: unknown): FinancialUnitDetection {
  const $ = cheerio.load(html);
  $("script,style,noscript,svg,form").remove();
  const text = $("body").text().replace(/\u00a0/g, " ").replace(/\s+/g, " ");

  const unitLabel = "(crores?|cr\\.?|lakhs?|lacs?|millions?|mn|thousands?|000s)";
  const declarationPatterns = [
    new RegExp(`(?:amounts?|figures?|financials?|particulars)[^.;]{0,45}\\bin\\s+${unitLabel}\\b`, "gi"),
    new RegExp(`(?:₹|rs\\.?|inr)\\s+in\\s+${unitLabel}\\b`, "gi"),
    new RegExp(`\\(\\s*(?:₹|rs\\.?|inr)\\s*${unitLabel}\\s*\\)`, "gi"),
  ];
  const declarations = declarationPatterns.flatMap((pattern) =>
    Array.from(text.matchAll(pattern)).map((match) => unitFromLabel(match[1])),
  ).filter((unit): unit is DetectedFinancialUnit => Boolean(unit));
  const declaredUnits = Array.from(new Set(declarations));
  if (declaredUnits.length === 1) {
    return { evidence: `Explicit source unit declaration: ${declaredUnits[0]}.`, unit: declaredUnits[0] };
  }
  if (declaredUnits.length > 1) {
    return { evidence: `Conflicting explicit source units: ${declaredUnits.join(", ")}.`, unit: null };
  }

  const tableNumbers = collectTableNumbers(financialTable);
  const evidence = new Map<DetectedFinancialUnit, Set<string>>();
  const amountPattern = /(?:₹|rs\.?|inr)?\s*(-?\(?\d[\d,]*(?:\.\d+)?\)?)\s*(crores?|cr\.?|lakhs?|lacs?|millions?|mn|thousands?|000s)\b/gi;
  for (const match of text.matchAll(amountPattern)) {
    const token = numericToken(match[1]);
    const unit = unitFromLabel(match[2]);
    if (!token || !unit || !tableNumbers.has(token)) continue;
    const values = evidence.get(unit) ?? new Set<string>();
    values.add(token);
    evidence.set(unit, values);
  }

  const ranked = Array.from(evidence.entries()).sort((left, right) => right[1].size - left[1].size);
  const best = ranked[0];
  const second = ranked[1];
  if (best && best[1].size >= 2 && (!second || best[1].size >= second[1].size + 2)) {
    return {
      evidence: `${best[1].size} financial values are repeated with the ${best[0]} unit in the source.`,
      unit: best[0],
    };
  }

  return { evidence: "No unambiguous monetary unit evidence was found near the source financial data.", unit: null };
}
