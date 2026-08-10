export interface NormalizedFinancialRow {
  debt_equity: number | null;
  ebitda_cr: number | null;
  ebitda_margin_pct: number | null;
  eps: number | null;
  financial_year: string;
  net_worth_cr: number | null;
  pat_cr: number | null;
  pat_margin_pct: number | null;
  reserves_cr: number | null;
  revenue_cr: number | null;
  roce_pct: number | null;
  roe_pct: number | null;
  total_assets_cr: number | null;
  total_borrowings_cr: number | null;
  total_income_cr: number | null;
}

export interface NormalizedFinancialTable {
  confidence: "high" | "medium" | "low";
  rejectedRows: Array<{ reason: string; row: unknown }>;
  rows: NormalizedFinancialRow[];
  unit: "crore" | "lakh" | "million" | "thousand" | "unknown";
  warnings: string[];
}

type FinancialMetric = Exclude<keyof NormalizedFinancialRow, "financial_year">;
type SourceRow = Record<string, unknown>;

const EMPTY_VALUE = /^(?:|[-–—]|na|n\/a|null|nil|not available|\[?●\]?)$/i;

const METRIC_PATTERNS: Array<{ key: FinancialMetric; patterns: RegExp[]; excludes?: RegExp[] }> = [
  { key: "revenue_cr", patterns: [/^revenue(?: from operations)?$/i, /^net sales$/i, /^sales$/i, /revenue from operations/i], excludes: [/growth|margin/i] },
  { key: "total_income_cr", patterns: [/^total income$/i, /^income$/i], excludes: [/growth|margin/i] },
  { key: "pat_cr", patterns: [/profit\s*(?:\/|or)?\s*loss\s*after tax/i, /profit after tax/i, /^pat$/i, /net profit/i], excludes: [/margin|growth|ratio/i] },
  { key: "ebitda_cr", patterns: [/^ebitda$/i, /earnings before interest.*tax.*depreciation/i], excludes: [/margin|ratio/i] },
  { key: "net_worth_cr", patterns: [/net worth/i], excludes: [/return|ronw/i] },
  { key: "reserves_cr", patterns: [/^reserves?(?: and surplus)?$/i, /^reserve & surplus$/i] },
  { key: "total_assets_cr", patterns: [/^total assets$/i, /^assets$/i] },
  { key: "total_borrowings_cr", patterns: [/total borrowings?/i, /^borrowings?$/i, /^total debt$/i, /^debt$/i], excludes: [/equity|ratio/i] },
  { key: "eps", patterns: [/^basic eps$/i, /^diluted eps$/i, /^eps$/i, /earnings per share/i] },
  { key: "roe_pct", patterns: [/^roe$/i, /return on equity/i, /return on net worth/i, /^ronw$/i] },
  { key: "roce_pct", patterns: [/^roce$/i, /return on capital employed/i] },
  { key: "debt_equity", patterns: [/debt\s*(?:\/|to)?\s*equity/i, /^d\s*\/\s*e$/i] },
  { key: "pat_margin_pct", patterns: [/pat margin/i, /net profit margin/i] },
  { key: "ebitda_margin_pct", patterns: [/ebitda margin/i] },
];

const AMOUNT_METRICS = new Set<FinancialMetric>([
  "revenue_cr",
  "pat_cr",
  "ebitda_cr",
  "net_worth_cr",
  "reserves_cr",
  "total_assets_cr",
  "total_borrowings_cr",
  "total_income_cr",
]);

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseFinancialNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (EMPTY_VALUE.test(text)) return null;
  const negative = /^\s*\([^)]*\)\s*$/.test(text) || /^\s*-/.test(text);
  const numeric = text
    .replace(/[₹,%]/g, "")
    .replace(/\b(?:rs\.?|inr|crores?|cr\.?|lakhs?|lacs?|millions?|mn|thousands?|000s)\b/gi, "")
    .replace(/[()\s]/g, "")
    .replace(/,/g, "");
  const parsed = Number.parseFloat(numeric);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

function detectUnit(rows: SourceRow[], explicitUnit?: NormalizedFinancialTable["unit"]) {
  if (explicitUnit) return explicitUnit;
  const text = JSON.stringify(rows).toLowerCase();
  if (/\b(?:lakh|lakhs|lac|lacs)\b/.test(text)) return "lakh" as const;
  if (/\b(?:million|millions|mn)\b/.test(text)) return "million" as const;
  if (/\b(?:thousand|thousands|000s)\b/.test(text)) return "thousand" as const;
  if (/\b(?:crore|crores|cr\.?)(?:\s|\)|$)/.test(text)) return "crore" as const;
  return "unknown" as const;
}

function amountFactor(unit: NormalizedFinancialTable["unit"]) {
  if (unit === "lakh") return 0.01;
  if (unit === "million") return 0.1;
  if (unit === "thousand") return 0.0001;
  return 1;
}

function metricForLabel(label: string): FinancialMetric | null {
  const normalized = label
    .replace(/\([^)]*(?:₹|rs|inr|cr|crore|lakh|million)[^)]*\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  for (const metric of METRIC_PATTERNS) {
    if (metric.excludes?.some((pattern) => pattern.test(normalized))) continue;
    if (metric.patterns.some((pattern) => pattern.test(normalized))) return metric.key;
  }
  return null;
}

function fullYear(value: string) {
  const parsed = Number(value);
  return value.length === 2 ? 2000 + parsed : parsed;
}

function rangeEndYear(start: string, end?: string) {
  const startYear = fullYear(start);
  if (!end) return startYear;
  if (end.length === 4) return Number(end);
  const century = Math.floor(startYear / 100) * 100;
  const candidate = century + Number(end);
  return candidate < startYear ? candidate + 100 : candidate;
}

export function canonicalFinancialPeriod(value: unknown) {
  const text = cleanText(value)
    .replace(/\b(?:period ended|year ended|as at|for the year ended)\b/gi, "")
    .replace(/(\d)(?:st|nd|rd|th)\b/gi, "$1")
    .replace(/[()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const maxYear = new Date().getFullYear() + 2;
  const validYear = (year: number) => year >= 2000 && year <= maxYear;

  const fiscal = text.match(/^FY\s*((?:20)?\d{2})(?:\s*[-/]\s*((?:20)?\d{2}))?$/i);
  if (fiscal) {
    const year = rangeEndYear(fiscal[1], fiscal[2]);
    return validYear(year) ? String(year) : null;
  }

  const yearRange = text.match(/^(20\d{2})(?:\s*[-/]\s*((?:20)?\d{2}))?$/);
  if (yearRange) {
    const year = rangeEndYear(yearRange[1], yearRange[2]);
    return validYear(year) ? String(year) : null;
  }

  const dayFirst = text.match(/\b(\d{1,2})\s*[-/, ]\s*(mar(?:ch)?|jun(?:e)?|sep(?:t(?:ember)?)?|dec(?:ember)?)\s*[-/, ]\s*(20\d{2})\b/i);
  const monthFirst = text.match(/\b(mar(?:ch)?|jun(?:e)?|sep(?:t(?:ember)?)?|dec(?:ember)?)\s*[-/, ]\s*(\d{1,2})\s*[-/, ]\s*(20\d{2})\b/i);
  const date = dayFirst
    ? { day: dayFirst[1], month: dayFirst[2], year: Number(dayFirst[3]) }
    : monthFirst
      ? { day: monthFirst[2], month: monthFirst[1], year: Number(monthFirst[3]) }
      : null;
  if (!date || !validYear(date.year)) return null;
  if (/^mar/i.test(date.month)) return String(date.year);
  const month = /^jun/i.test(date.month) ? "JUN" : /^sep/i.test(date.month) ? "SEP" : "DEC";
  return `${date.day.padStart(2, "0")} ${month} ${date.year}`;
}

function promoteGenericHeader(rows: SourceRow[]) {
  if (rows.length < 2) return rows;
  const keys = Object.keys(rows[0]);
  if (!keys.length || !keys.every((key) => /^column\s+\d+$/i.test(key))) return rows;
  const headers = keys.map((key) => cleanText(rows[0][key]));
  if (!headers.some((header) => canonicalFinancialPeriod(header))) return rows;

  return rows.slice(1).map((row) => {
    const promoted: SourceRow = {};
    keys.forEach((key, index) => {
      promoted[headers[index] || key] = row[key];
    });
    return promoted;
  });
}

function emptyFinancialRow(period: string): NormalizedFinancialRow {
  return {
    debt_equity: null,
    ebitda_cr: null,
    ebitda_margin_pct: null,
    eps: null,
    financial_year: period,
    net_worth_cr: null,
    pat_cr: null,
    pat_margin_pct: null,
    reserves_cr: null,
    revenue_cr: null,
    roce_pct: null,
    roe_pct: null,
    total_assets_cr: null,
    total_borrowings_cr: null,
    total_income_cr: null,
  };
}

function scaledValue(metric: FinancialMetric, value: unknown, factor: number) {
  const parsed = parseFinancialNumber(value);
  if (parsed === null) return null;
  return AMOUNT_METRICS.has(metric) ? Number((parsed * factor).toFixed(4)) : parsed;
}

function parseTransposed(rows: SourceRow[], factor: number) {
  const keys = Object.keys(rows[0] ?? {});
  const periods = keys.map((key) => ({ key, period: canonicalFinancialPeriod(key) })).filter((item): item is { key: string; period: string } => Boolean(item.period));
  if (periods.length === 0) return [];
  const labelKey = keys.find((key) => !canonicalFinancialPeriod(key)) ?? keys[0];
  const metricRows = new Map<FinancialMetric, SourceRow>();

  for (const row of rows) {
    const metric = metricForLabel(cleanText(row[labelKey]));
    if (metric && !metricRows.has(metric)) metricRows.set(metric, row);
  }

  if (!metricRows.has("revenue_cr") && !metricRows.has("total_income_cr") && !metricRows.has("pat_cr")) return [];

  return periods.map(({ key, period }) => {
    const output = emptyFinancialRow(period);
    for (const [metric, row] of metricRows) {
      output[metric] = scaledValue(metric, row[key], factor);
    }
    return output;
  });
}

function valueForMetric(row: SourceRow, metric: FinancialMetric, factor: number) {
  const direct = row[metric];
  if (direct !== undefined) return scaledValue(metric, direct, factor);
  for (const [key, value] of Object.entries(row)) {
    if (metricForLabel(key) === metric) return scaledValue(metric, value, factor);
  }
  return null;
}

function parseStandard(rows: SourceRow[], factor: number) {
  const parsed: NormalizedFinancialRow[] = [];
  for (const row of rows) {
    const periodEntry = Object.entries(row).find(([key, value]) =>
      /period|financial.?year|year|date/i.test(key) && canonicalFinancialPeriod(value))
      ?? Object.entries(row).find(([, value]) => canonicalFinancialPeriod(value));
    const period = canonicalFinancialPeriod(periodEntry?.[1]);
    if (!period) continue;

    const output = emptyFinancialRow(period);
    for (const metric of METRIC_PATTERNS.map((item) => item.key)) {
      output[metric] = valueForMetric(row, metric, factor);
    }
    parsed.push(output);
  }
  return parsed;
}

function calculateDerivedMetrics(row: NormalizedFinancialRow) {
  const output = { ...row };
  if (output.revenue_cr !== null && output.revenue_cr !== 0) {
    if (output.pat_cr !== null) output.pat_margin_pct = Number(((output.pat_cr / output.revenue_cr) * 100).toFixed(2));
    if (output.ebitda_cr !== null) output.ebitda_margin_pct = Number(((output.ebitda_cr / output.revenue_cr) * 100).toFixed(2));
  }
  if (output.debt_equity === null && output.total_borrowings_cr !== null && output.net_worth_cr !== null && output.net_worth_cr > 0) {
    output.debt_equity = Number((output.total_borrowings_cr / output.net_worth_cr).toFixed(2));
  }
  return output;
}

function usefulMetricCount(row: NormalizedFinancialRow) {
  return Object.entries(row).filter(([key, value]) => key !== "financial_year" && value !== null).length;
}

function validateRow(row: NormalizedFinancialRow) {
  if (row.revenue_cr !== null && row.revenue_cr < 0) return "Revenue/total income cannot be negative.";
  for (const metric of AMOUNT_METRICS) {
    const value = row[metric];
    if (value !== null && Math.abs(value) > 1_000_000) return `${metric} is outside the supported crore range.`;
  }
  for (const metric of ["pat_margin_pct", "ebitda_margin_pct", "roe_pct", "roce_pct"] as const) {
    const value = row[metric];
    if (value !== null && Math.abs(value) > 5_000) return `${metric} is outside the supported percentage range.`;
  }
  if (row.pat_margin_pct !== null && row.pat_margin_pct > 100) return "PAT exceeds 100% of revenue; row requires source review.";
  if (row.ebitda_margin_pct !== null && row.ebitda_margin_pct > 100) return "EBITDA exceeds 100% of revenue; row requires source review.";
  if (row.revenue_cr === null && row.total_income_cr === null && row.pat_cr === null) return "Row has neither revenue, total income nor PAT.";
  if (usefulMetricCount(row) < 2) return "Row has fewer than two usable financial metrics.";
  return null;
}

function periodSortValue(period: string) {
  const shortFinancialYear = period.match(/\bFY\s*(\d{2})(?!\d)/i)?.[1];
  if (shortFinancialYear) return 2000 + Number(shortFinancialYear);
  const years = period.match(/20\d{2}|\b\d{2}\b/g) ?? [];
  const last = years.at(-1);
  if (!last) return 0;
  return last.length === 2 ? 2000 + Number(last) : Number(last);
}

export function normalizeFinancialTable(
  value: unknown,
  options: { unit?: NormalizedFinancialTable["unit"] } = {},
): NormalizedFinancialTable {
  const warnings: string[] = [];
  const rejectedRows: NormalizedFinancialTable["rejectedRows"] = [];
  if (!Array.isArray(value)) {
    return { confidence: "low", rejectedRows: [{ reason: "Financial table is not an array.", row: value }], rows: [], unit: "unknown", warnings };
  }

  const sourceRows = promoteGenericHeader(value.filter((row): row is SourceRow => Boolean(row) && typeof row === "object" && !Array.isArray(row)));
  if (sourceRows.length === 0) {
    return { confidence: "low", rejectedRows: [{ reason: "Financial table has no object rows.", row: value }], rows: [], unit: "unknown", warnings };
  }

  const unit = detectUnit(sourceRows, options.unit);
  const factor = amountFactor(unit);
  if (unit === "unknown") warnings.push("Financial source did not state an unambiguous monetary unit.");

  const transposed = parseTransposed(sourceRows, factor);
  const parsed = transposed.length > 0 ? transposed : parseStandard(sourceRows, factor);
  const byPeriod = new Map<string, NormalizedFinancialRow>();

  for (const rawRow of parsed) {
    const row = calculateDerivedMetrics(rawRow);
    const reason = validateRow(row);
    if (reason) {
      rejectedRows.push({ reason, row: rawRow });
      continue;
    }
    const existing = byPeriod.get(row.financial_year);
    if (!existing || usefulMetricCount(row) > usefulMetricCount(existing)) byPeriod.set(row.financial_year, row);
  }

  const rows = Array.from(byPeriod.values()).sort((left, right) =>
    periodSortValue(left.financial_year) - periodSortValue(right.financial_year)
      || left.financial_year.localeCompare(right.financial_year));

  if (parsed.length === 0) warnings.push("No recognizable yearly/period financial layout was found.");
  if (rejectedRows.length > 0) warnings.push(`${rejectedRows.length} financial row(s) failed validation.`);

  return {
    confidence: rows.length >= 3 && unit !== "unknown" ? "high" : rows.length >= 2 ? "medium" : rows.length === 1 ? "low" : "low",
    rejectedRows,
    rows,
    unit,
    warnings,
  };
}
