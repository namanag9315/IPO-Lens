/**
 * generateResearchNarrative.ts
 *
 * Orchestrates narrative generation: tries Groq first, falls back to deterministic.
 * Returns ResearchNarrative. Never throws.
 */

import type { IPOResearchView } from "@/lib/ipo-engine-clean/public/buildIPOResearchView";
import { buildDeterministicResearchNarrative, type ResearchNarrative } from "./buildDeterministicResearchNarrative";
import { callGroq } from "./callGroq";
import { validateResearchNarrative } from "./validateResearchNarrative";

function buildPromptPayload(view: IPOResearchView): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: view.hero.name,
    type: view.hero.category,
    exchange: view.hero.exchange,
    status: view.hero.status,
  };

  if (view.hero.issueSizeCr !== null) payload.issueSizeCr = view.hero.issueSizeCr;
  if (view.hero.priceBand) payload.priceBand = view.hero.priceBand;
  if (view.hero.gmpValue !== null) payload.gmpValue = view.hero.gmpValue;
  if (view.hero.gmpPercent !== null) payload.gmpPercent = view.hero.gmpPercent;
  if (view.hero.totalSubscription !== null) payload.totalSubscription = view.hero.totalSubscription;
  if (view.hero.allotmentChancePct !== null) payload.allotmentChancePct = view.hero.allotmentChancePct;

  // Company
  const company: Record<string, unknown> = {};
  if (view.company.description) company.description = view.company.description.slice(0, 300);
  if (view.company.sector) company.sector = view.company.sector;
  if (view.company.productsServices) company.productsServices = view.company.productsServices.slice(0, 200);
  if (view.company.headquarters) company.headquarters = view.company.headquarters;
  if (Object.keys(company).length > 0) payload.company = company;

  // Valuation
  const valuation: Record<string, unknown> = {};
  if (view.valuation.ipoPE !== null) valuation.ipoPE = view.valuation.ipoPE;
  if (view.valuation.peerAveragePE !== null) valuation.peerAveragePE = view.valuation.peerAveragePE;
  if (view.valuation.peerHighPE !== null) valuation.peerHighPE = view.valuation.peerHighPE;
  if (view.valuation.priceToBook !== null) valuation.priceToBook = view.valuation.priceToBook;
  if (view.valuation.peerRows.length > 0) valuation.peerCount = view.valuation.peerRows.length;
  if (Object.keys(valuation).length > 0) payload.valuation = valuation;

  // Financials
  const financials: Record<string, unknown> = {};
  if (view.financials.latestRevenue !== null) financials.latestRevenueCr = view.financials.latestRevenue;
  if (view.financials.latestPAT !== null) financials.latestPATCr = view.financials.latestPAT;
  if (view.financials.revenueGrowth !== null) financials.revenueGrowthPct = view.financials.revenueGrowth;
  if (view.financials.patGrowth !== null) financials.patGrowthPct = view.financials.patGrowth;
  if (view.financials.latestROE !== null) financials.latestROEPct = view.financials.latestROE;
  if (view.financials.latestROCE !== null) financials.latestROCEPct = view.financials.latestROCE;
  if (Object.keys(financials).length > 0) payload.financials = financials;

  // Demand
  const demand: Record<string, unknown> = {};
  if (view.demand.totalTimes !== null) demand.totalX = view.demand.totalTimes;
  if (view.demand.retailTimes !== null) demand.retailX = view.demand.retailTimes;
  if (view.demand.qibTimes !== null) demand.qibX = view.demand.qibTimes;
  if (view.demand.niiTimes !== null) demand.niiX = view.demand.niiTimes;
  if (Object.keys(demand).length > 0) payload.demand = demand;

  // Manager
  const manager: Record<string, unknown> = {};
  if (view.manager.leadManagerName) manager.leadManager = view.manager.leadManagerName;
  if (view.manager.leadManagerScore !== null) manager.leadManagerScore = view.manager.leadManagerScore;
  if (view.manager.registrarName) manager.registrar = view.manager.registrarName;
  if (Object.keys(manager).length > 0) payload.manager = manager;

  // Score
  payload.score = {
    value: view.score.score,
    label: view.score.label,
    missingDataCount: view.score.missingData.length,
  };

  // Risks
  if (view.risk.risks.length > 0) {
    payload.risks = view.risk.risks.slice(0, 5).map((r) => ({
      title: r.title,
      severity: r.severity,
    }));
  }

  return payload;
}

const SYSTEM_PROMPT = `You are an IPO research assistant for retail investors in India.
Your job is to write a clear, factual, educational research narrative for a given IPO.

STRICT RULES:
- Return ONLY valid JSON matching the ResearchNarrative type. No markdown, no extra text.
- Use ONLY the data provided in the input. Do NOT invent facts.
- Do NOT use these words anywhere: apply, avoid, buy, sell, subscribe, invest (any form or tense).
- Write in simple, plain educational English suitable for retail investors.
- If GMP is present, mention it is unofficial and can change rapidly.
- The IPO score is a rule-based signal, not financial advice — say so in context.
- If a field is missing from input, say data is "pending" or "not available" — do not fabricate.

OUTPUT SCHEMA (return exactly this JSON shape):
{
  "simpleSummary": "1-2 sentence description of what the company does, issue size, and IPO type.",
  "companyBullets": ["bullet 1", "bullet 2"],
  "valuationCommentary": "P/E commentary with peer comparison context if available.",
  "financialCommentary": "Revenue/PAT/growth commentary if available.",
  "demandCommentary": "Subscription commentary if available.",
  "managerCommentary": "Lead manager and registrar details.",
  "riskBullets": ["risk title 1", "risk title 2"],
  "sectionsToShow": {
    "company": true,
    "valuation": true,
    "financials": true,
    "peerComparison": false,
    "demand": true,
    "manager": true,
    "risks": true,
    "rawAudit": true
  }
}`;

export async function generateResearchNarrative(
  view: IPOResearchView
): Promise<ResearchNarrative> {
  const fallback = buildDeterministicResearchNarrative(view);

  // Step 1: No API key → immediate deterministic fallback
  if (!process.env.GROQ_API_KEY) {
    return fallback;
  }

  // Step 2: Build prompt
  const promptPayload = buildPromptPayload(view);
  const userContent = `Generate a ResearchNarrative for this IPO:\n${JSON.stringify(promptPayload, null, 2)}`;

  // Step 3: Call Groq
  const groqResult = await callGroq({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0.2,
    maxTokens: 1500,
  });

  // Step 4: If Groq fails → deterministic fallback
  if (!groqResult.ok || !groqResult.text) {
    return fallback;
  }

  // Step 5: Parse JSON
  let parsed: unknown;
  try {
    // Strip markdown code fences if model wraps output
    const cleaned = groqResult.text.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return fallback;
  }

  // Step 6: Validate
  const validation = validateResearchNarrative(parsed, view);
  if (!validation.valid || !validation.result) {
    return fallback;
  }

  // Step 7: Return Groq result
  return validation.result;
}
