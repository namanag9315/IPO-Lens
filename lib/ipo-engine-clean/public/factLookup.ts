export interface CleanFact {
  fact_key: string;
  fact_value: any;
  display_value?: string | null;
  source_provider?: string | null;
  source_url?: string | null;
  confidence?: string | null;
}

const PLACEHOLDERS = new Set(["", "-", "na", "n/a", "being verified", "pending"]);

export function isPlaceholder(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string") {
    const cleaned = val.trim().toLowerCase();
    return PLACEHOLDERS.has(cleaned);
  }
  if (Array.isArray(val)) {
    return val.length === 0 || val.every(isPlaceholder);
  }
  if (typeof val === "object") {
    return Object.keys(val).length === 0;
  }
  return false;
}

export function cleanLabelText(text: string | null | undefined): string {
  if (!text) return "";
  let cleaned = text
    .replace(/SME IPO so far/gi, "")
    .replace(/IPO so far/gi, "")
    .replace(/Sector Update/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Trim leading/trailing punctuation like commas, slashes, dots
  cleaned = cleaned.replace(/^[\s,.:;/-]+|[\s,.:;/-]+$/g, "").trim();
  return cleaned;
}

export function parseIndianNumber(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const cleaned = value.replace(/₹|rs\.?|inr|cr|crore|,|\s/gi, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getFact(facts: CleanFact[], factKey: string, sourceProvider?: string): CleanFact | null {
  if (!Array.isArray(facts)) return null;
  let matches = facts.filter((f) => f.fact_key === factKey);
  if (sourceProvider) {
    matches = matches.filter((f) => f.source_provider === sourceProvider);
  }
  return matches[0] ?? null;
}

export function getFactValue(facts: CleanFact[], factKey: string, sourceProvider?: string): any {
  const fact = getFact(facts, factKey, sourceProvider);
  if (!fact || isPlaceholder(fact.fact_value)) return null;
  return fact.fact_value;
}

export function getFactDisplay(facts: CleanFact[], factKey: string): string | null {
  const fact = getFact(facts, factKey);
  if (!fact) return null;
  if (fact.display_value && !isPlaceholder(fact.display_value)) {
    return fact.display_value;
  }
  const val = fact.fact_value;
  if (isPlaceholder(val)) return null;
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return JSON.stringify(val);
}

export function getFactJson(facts: CleanFact[], factKey: string): any {
  const val = getFactValue(facts, factKey);
  if (!val) return null;
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return val;
}

export function getFirstUsableFact(facts: CleanFact[], factKeys: string[]): { factKey: string; value: any; fact: CleanFact } | null {
  for (const key of factKeys) {
    const fact = getFact(facts, key);
    if (fact && !isPlaceholder(fact.fact_value)) {
      return { factKey: key, value: fact.fact_value, fact };
    }
  }
  return null;
}

export function hasUsableFact(facts: CleanFact[], factKey: string): boolean {
  const val = getFactValue(facts, factKey);
  return val !== null && val !== undefined;
}

export function normalizePercent(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const num = parseIndianNumber(value);
  return num;
}

export function normalizeMoney(value: any): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  const num = parseIndianNumber(value);
  return num;
}
