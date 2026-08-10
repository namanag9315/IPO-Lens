/**
 * validateResearchNarrative.ts
 *
 * Validates raw Groq output against the ResearchNarrative type contract.
 * Rejects forbidden investment language and enforces shape requirements.
 */

import type { IPOResearchView } from "@/lib/ipo-engine-clean/public/buildIPOResearchView";
import type { ResearchNarrative } from "./buildDeterministicResearchNarrative";

export type ValidationResult =
  | { valid: true; reason: null; result: ResearchNarrative }
  | { valid: false; reason: string; result: null };

const REQUIRED_STRING_KEYS: (keyof ResearchNarrative)[] = [
  "simpleSummary",
  "valuationCommentary",
  "financialCommentary",
  "demandCommentary",
  "managerCommentary",
];

const REQUIRED_ARRAY_KEYS: (keyof ResearchNarrative)[] = [
  "companyBullets",
  "riskBullets",
];

const SECTIONS_TO_SHOW_KEYS: (keyof ResearchNarrative["sectionsToShow"])[] = [
  "company",
  "valuation",
  "financials",
  "peerComparison",
  "demand",
  "manager",
  "risks",
  "rawAudit",
];

/**
 * Words that indicate investment advice — never allowed in generated text.
 */
const FORBIDDEN_WORDS = ["apply", "avoid", "buy", "sell", "subscribe", "invest"];

function containsForbiddenWord(text: string): string | null {
  const lower = text.toLowerCase();
  for (const word of FORBIDDEN_WORDS) {
    // Use word-boundary-like check: surrounded by non-alpha chars
    const regex = new RegExp(`(?<![a-z])${word}(?![a-z])`, "i");
    if (regex.test(lower)) return word;
  }
  return null;
}

function checkTextFields(obj: Record<string, unknown>): string | null {
  for (const key of REQUIRED_STRING_KEYS) {
    const val = obj[key];
    if (typeof val !== "string") continue;
    const forbidden = containsForbiddenWord(val);
    if (forbidden) {
      return `Field "${key}" contains forbidden word: "${forbidden}"`;
    }
  }

  // Also check array fields (each element)
  for (const key of REQUIRED_ARRAY_KEYS) {
    const arr = obj[key];
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (typeof item !== "string") continue;
      const forbidden = containsForbiddenWord(item);
      if (forbidden) {
        return `Array field "${key}" contains forbidden word: "${forbidden}"`;
      }
    }
  }

  return null;
}

export function validateResearchNarrative(
  raw: unknown,
  _view: IPOResearchView
): ValidationResult {
  if (raw === null || raw === undefined || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, reason: "Response is not a JSON object", result: null };
  }

  const obj = raw as Record<string, unknown>;

  // Check required string keys exist
  for (const key of REQUIRED_STRING_KEYS) {
    if (!(key in obj)) {
      return { valid: false, reason: `Missing required key: "${key}"`, result: null };
    }
    if (typeof obj[key] !== "string") {
      return { valid: false, reason: `Key "${key}" must be a string`, result: null };
    }
  }

  // Check simpleSummary is non-empty
  if ((obj.simpleSummary as string).trim() === "") {
    return { valid: false, reason: "simpleSummary must not be empty", result: null };
  }

  // Check required array keys
  for (const key of REQUIRED_ARRAY_KEYS) {
    if (!(key in obj)) {
      return { valid: false, reason: `Missing required array key: "${key}"`, result: null };
    }
    if (!Array.isArray(obj[key])) {
      return { valid: false, reason: `Key "${key}" must be an array`, result: null };
    }
  }

  // Check sectionsToShow exists and is an object
  if (!("sectionsToShow" in obj)) {
    return { valid: false, reason: 'Missing required key: "sectionsToShow"', result: null };
  }

  const sectionsToShow = obj.sectionsToShow;
  if (
    sectionsToShow === null ||
    typeof sectionsToShow !== "object" ||
    Array.isArray(sectionsToShow)
  ) {
    return { valid: false, reason: '"sectionsToShow" must be an object', result: null };
  }

  // Check all sectionsToShow keys present
  const sections = sectionsToShow as Record<string, unknown>;
  for (const key of SECTIONS_TO_SHOW_KEYS) {
    if (!(key in sections)) {
      return {
        valid: false,
        reason: `Missing sectionsToShow key: "${key}"`,
        result: null,
      };
    }
  }

  // Check forbidden words in all text fields
  const forbiddenReason = checkTextFields(obj);
  if (forbiddenReason) {
    return { valid: false, reason: forbiddenReason, result: null };
  }

  // Build the validated result
  const result: ResearchNarrative = {
    simpleSummary: obj.simpleSummary as string,
    companyBullets: (obj.companyBullets as unknown[]).filter((v) => typeof v === "string") as string[],
    valuationCommentary: obj.valuationCommentary as string,
    financialCommentary: obj.financialCommentary as string,
    demandCommentary: obj.demandCommentary as string,
    managerCommentary: obj.managerCommentary as string,
    riskBullets: (obj.riskBullets as unknown[]).filter((v) => typeof v === "string") as string[],
    sectionsToShow: {
      company: Boolean(sections.company),
      valuation: Boolean(sections.valuation),
      financials: Boolean(sections.financials),
      peerComparison: Boolean(sections.peerComparison),
      demand: Boolean(sections.demand),
      manager: Boolean(sections.manager),
      risks: Boolean(sections.risks),
      rawAudit: Boolean(sections.rawAudit),
    },
  };

  return { valid: true, reason: null, result };
}
