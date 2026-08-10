import { canonicalFinancialPeriod, normalizeFinancialTable, type NormalizedFinancialRow } from "@/lib/ipo-engine-clean/financials/normalizeFinancialTable";
import { supabaseAdmin } from "@/lib/supabase";

type FinancialMetadataSupport = boolean | null;
let metadataSupport: FinancialMetadataSupport = null;
const sessionSourcePriorities = new Map<string, number>();

const BASE_COLUMNS = [
  "revenue_cr",
  "pat_cr",
  "ebitda_cr",
  "ebitda_margin_pct",
  "pat_margin_pct",
  "net_worth_cr",
  "total_borrowings_cr",
  "debt_equity",
  "eps",
  "roe_pct",
  "roce_pct",
] as const;

const EXTENDED_COLUMNS = [
  { database: "assets_cr", incoming: "total_assets_cr" },
  { database: "reserves_cr", incoming: "reserves_cr" },
  { database: "total_income_cr", incoming: "total_income_cr" },
] as const;

export interface MaterializeFinancialsResult {
  conflicts: string[];
  parsed: number;
  rejected: number;
  saved: number;
  skipped: number;
  warnings: string[];
}

async function hasMetadataColumns() {
  if (metadataSupport !== null) return metadataSupport;
  const { error } = await supabaseAdmin
    .from("ipo_financials_yearly")
    .select("admin_verified,source,source_url,source_priority,confidence,last_imported_at,assets_cr,reserves_cr,total_income_cr")
    .limit(1);
  metadataSupport = !error;
  return metadataSupport;
}

function finiteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function materiallyDifferent(left: number, right: number) {
  const absolute = Math.abs(left - right);
  const scale = Math.max(Math.abs(left), Math.abs(right), 1);
  return absolute > 0.05 && absolute / scale > 0.03;
}

function mergeRow({
  existing,
  existingPriorityOverride,
  includeExtended,
  incoming,
  sourcePriority,
}: {
  existing: Record<string, unknown> | null;
  existingPriorityOverride?: number | null;
  includeExtended: boolean;
  incoming: NormalizedFinancialRow;
  sourcePriority: number;
}) {
  const conflicts: string[] = [];
  const merged: Record<string, unknown> = {
    financial_year: String(existing?.financial_year ?? incoming.financial_year),
  };
  const adminVerified = existing?.admin_verified === true;
  const existingPriority = existingPriorityOverride ?? finiteNumber(existing?.source_priority);
  const newSourceIsBetter = existingPriority !== null && sourcePriority < existingPriority;
  const newSourceIsWorse = existingPriority !== null && sourcePriority > existingPriority;

  const columns: Array<{ database: string; incoming: keyof NormalizedFinancialRow }> = [
    ...BASE_COLUMNS.map((column) => ({ database: column, incoming: column })),
    ...(includeExtended ? EXTENDED_COLUMNS : []),
  ];

  for (const column of columns) {
    const oldValue = finiteNumber(existing?.[column.database]);
    const newValue = incoming[column.incoming] as number | null;

    if (newValue === null) {
      merged[column.database] = oldValue;
      continue;
    }
    if (oldValue === null) {
      merged[column.database] = newValue;
      continue;
    }
    if (!materiallyDifferent(oldValue, newValue)) {
      merged[column.database] = newSourceIsWorse ? oldValue : newValue;
      continue;
    }

    if (adminVerified || !newSourceIsBetter) {
      merged[column.database] = oldValue;
      conflicts.push(`${incoming.financial_year}.${column.database}: kept existing ${oldValue}; source reported ${newValue}.`);
    } else {
      merged[column.database] = newValue;
      conflicts.push(`${incoming.financial_year}.${column.database}: replaced ${oldValue} with ${newValue} from a higher-priority source.`);
    }
  }

  return { conflicts, merged };
}

function samePersistedValues(existing: Record<string, unknown>, merged: Record<string, unknown>) {
  return Object.entries(merged).every(([column, value]) =>
    column === "financial_year" || finiteNumber(existing[column]) === finiteNumber(value));
}

async function writeAudit(payload: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from("ipo_financial_sync_audit").insert(payload);
  // The reliability migration may not be applied yet. The sync remains
  // backward-compatible and simply omits the optional audit row in that case.
  return !error;
}

export async function materializeFinancialTable({
  confidence,
  factValue,
  identityScore,
  ipoId,
  parser,
  sourcePriority,
  sourceProvider,
  sourceUrl,
  unit,
}: {
  confidence: "high" | "medium" | "low";
  factValue: unknown;
  identityScore?: number | null;
  ipoId: string;
  parser: "deterministic" | "groq_evidence_fallback";
  sourcePriority: number;
  sourceProvider: string;
  sourceUrl?: string | null;
  unit?: "crore" | "lakh" | "million" | "thousand" | "unknown";
}): Promise<MaterializeFinancialsResult> {
  const normalized = normalizeFinancialTable(factValue, { unit });
  const result: MaterializeFinancialsResult = {
    conflicts: [],
    parsed: normalized.rows.length,
    rejected: normalized.rejectedRows.length,
    saved: 0,
    skipped: 0,
    warnings: [...normalized.warnings],
  };

  if (normalized.unit === "unknown" && normalized.rows.length > 0) {
    result.rejected += normalized.rows.length;
    result.parsed = 0;
    result.warnings.push("Financial rows were not saved because their monetary unit could not be verified.");
    await writeAudit({
      confidence: "low",
      identity_score: identityScore ?? null,
      ipo_id: ipoId,
      parser,
      rows_parsed: normalized.rows.length,
      rows_saved: 0,
      source_provider: sourceProvider,
      source_url: sourceUrl ?? null,
      status: "rejected",
      warnings: result.warnings,
    });
    return result;
  }

  if (normalized.rows.length === 0) {
    await writeAudit({
      confidence,
      identity_score: identityScore ?? null,
      ipo_id: ipoId,
      parser,
      rows_parsed: 0,
      rows_saved: 0,
      source_provider: sourceProvider,
      source_url: sourceUrl ?? null,
      status: "rejected",
      warnings: [...result.warnings, ...normalized.rejectedRows.map((row) => row.reason)],
    });
    return result;
  }

  const [{ data: existingRows, error: existingError }, supportsMetadata] = await Promise.all([
    supabaseAdmin.from("ipo_financials_yearly").select("*").eq("ipo_id", ipoId),
    hasMetadataColumns(),
  ]);
  if (existingError) {
    result.warnings.push(`Unable to read existing financial rows: ${existingError.message}`);
    return result;
  }

  const existingByPeriod = new Map<string, Record<string, unknown>>();
  for (const row of (existingRows ?? []) as Array<Record<string, unknown>>) {
    const rawPeriod = String(row.financial_year ?? "");
    const canonicalPeriod = canonicalFinancialPeriod(rawPeriod) ?? rawPeriod;
    const current = existingByPeriod.get(canonicalPeriod);
    if (!current || rawPeriod === canonicalPeriod) existingByPeriod.set(canonicalPeriod, row);
  }

  for (const incoming of normalized.rows) {
    const existing = existingByPeriod.get(incoming.financial_year) ?? null;
    const priorityKey = `${ipoId}:${incoming.financial_year}`;
    const merged = mergeRow({
      existing,
      existingPriorityOverride: sessionSourcePriorities.get(priorityKey) ?? null,
      includeExtended: supportsMetadata,
      incoming,
      sourcePriority,
    });
    result.conflicts.push(...merged.conflicts);

    if (existing && samePersistedValues(existing, merged.merged)) {
      result.skipped += 1;
      continue;
    }

    const row: Record<string, unknown> = {
      ...merged.merged,
      ipo_id: ipoId,
    };
    if (supportsMetadata) {
      row.admin_verified = existing?.admin_verified === true;
      row.confidence = confidence;
      row.last_imported_at = new Date().toISOString();
      row.source = sourceProvider;
      row.source_priority = sourcePriority;
      row.source_url = sourceUrl ?? null;
    }

    const { error } = await supabaseAdmin
      .from("ipo_financials_yearly")
      .upsert(row, { onConflict: "ipo_id,financial_year" });
    if (error) result.warnings.push(`${incoming.financial_year}: ${error.message}`);
    else {
      result.saved += 1;
      sessionSourcePriorities.set(priorityKey, sourcePriority);
    }
  }

  if (result.conflicts.length > 0) {
    result.warnings.push(`${result.conflicts.length} conflicting financial value(s) were preserved or resolved by source priority.`);
  }

  await writeAudit({
    confidence,
    identity_score: identityScore ?? null,
    ipo_id: ipoId,
    parser,
    rows_parsed: result.parsed,
    rows_saved: result.saved,
    source_provider: sourceProvider,
    source_url: sourceUrl ?? null,
    status: result.saved > 0 ? (result.warnings.length > 0 ? "partial" : "success") : "unchanged",
    warnings: [...result.warnings, ...result.conflicts],
  });

  return result;
}
