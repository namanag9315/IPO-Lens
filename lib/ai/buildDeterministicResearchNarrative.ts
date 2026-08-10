/**
 * buildDeterministicResearchNarrative.ts
 *
 * Builds a ResearchNarrative from an IPOResearchView using only deterministic data.
 * Works with no Groq key. Never throws.
 * No investment advice language.
 */

import type { IPOResearchView } from "@/lib/ipo-engine-clean/public/buildIPOResearchView";

export type ResearchNarrative = {
  simpleSummary: string;
  companyBullets: string[];
  valuationCommentary: string;
  financialCommentary: string;
  demandCommentary: string;
  managerCommentary: string;
  riskBullets: string[];
  sectionsToShow: {
    company: boolean;
    valuation: boolean;
    financials: boolean;
    peerComparison: boolean;
    demand: boolean;
    manager: boolean;
    risks: boolean;
    rawAudit: boolean;
  };
};

function fmtCr(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Cr`;
}

function fmtPct(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}%`;
}

function fmtPE(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}x`;
}

function typeLabel(category: "mainboard" | "sme"): string {
  return category === "sme" ? "SME IPO" : "Mainboard IPO";
}

export function buildDeterministicResearchNarrative(view: IPOResearchView): ResearchNarrative {
  // --- simpleSummary ---
  const name = view.hero.name;
  const type = typeLabel(view.hero.category);
  const sectorPart = view.company.sector ? ` in the ${view.company.sector} sector` : "";
  const issuePart = view.hero.issueSizeCr
    ? ` with an issue size of ${fmtCr(view.hero.issueSizeCr)}`
    : "";
  const descPart = view.company.description
    ? ` ${view.company.description.slice(0, 120).trimEnd()}${view.company.description.length > 120 ? "…" : ""}`
    : "";

  const simpleSummary =
    `${name} is a ${type}${sectorPart}${issuePart}.` +
    (descPart ? descPart : "");

  // --- companyBullets ---
  const companyBullets: string[] = [];
  if (view.company.sector) {
    companyBullets.push(`Operates in the ${view.company.sector} sector.`);
  }
  if (view.company.productsServices) {
    companyBullets.push(`Key products/services: ${view.company.productsServices.slice(0, 100)}.`);
  }
  if (view.company.headquarters) {
    companyBullets.push(`Headquartered in ${view.company.headquarters}.`);
  }

  // --- valuationCommentary ---
  let valuationCommentary: string;
  const ipoPE = view.valuation.ipoPE;
  const peerAvgPE = view.valuation.peerAveragePE;

  if (ipoPE !== null && peerAvgPE !== null) {
    const comparison = ipoPE <= peerAvgPE
      ? "below or near the sector peer average"
      : "above the sector peer average";
    valuationCommentary =
      `The IPO is priced at a P/E of ${fmtPE(ipoPE)}, which is ${comparison} (peer average P/E: ${fmtPE(peerAvgPE)}). This is factual data from the prospectus and market comparisons.`;
  } else if (ipoPE !== null) {
    valuationCommentary = `The IPO carries a P/E of ${fmtPE(ipoPE)}. Peer comparison data is limited, so relative valuation context is partial.`;
  } else if (peerAvgPE !== null) {
    valuationCommentary = `Peer average P/E is available at ${fmtPE(peerAvgPE)}, but the IPO P/E ratio has not been confirmed yet. Valuation details are partial.`;
  } else {
    valuationCommentary = "Valuation details are partial — IPO P/E and peer comparison data are not yet confirmed from available sources.";
  }

  // --- financialCommentary ---
  let financialCommentary: string;
  const rev = view.financials.latestRevenue;
  const pat = view.financials.latestPAT;
  const revGrowth = view.financials.revenueGrowth;
  const patGrowth = view.financials.patGrowth;

  const parts: string[] = [];
  if (rev !== null) parts.push(`latest revenue of ${fmtCr(rev)}`);
  if (pat !== null) parts.push(`net profit (PAT) of ${fmtCr(pat)}`);
  if (revGrowth !== null) parts.push(`revenue growth of ${fmtPct(revGrowth)} year-on-year`);
  if (patGrowth !== null) parts.push(`PAT growth of ${fmtPct(patGrowth)} year-on-year`);

  if (parts.length > 0) {
    financialCommentary = `The company reported ${parts.join(", ")}.`;
  } else if (view.financials.yearlyRows.length > 0) {
    financialCommentary = "Partial financial data is available. Growth metrics are being derived from available tables.";
  } else {
    financialCommentary = "Financial details are pending — no confirmed revenue or profit data is available from current sources.";
  }

  // --- demandCommentary ---
  let demandCommentary: string;
  const totalX = view.demand.totalTimes;
  const retailX = view.demand.retailTimes;
  const qibX = view.demand.qibTimes;
  const niiX = view.demand.niiTimes;

  if (totalX !== null) {
    const parts2: string[] = [`overall subscription of ${totalX.toFixed(1)}x`];
    if (retailX !== null) parts2.push(`retail at ${retailX.toFixed(1)}x`);
    if (qibX !== null) parts2.push(`QIB at ${qibX.toFixed(1)}x`);
    if (niiX !== null) parts2.push(`NII at ${niiX.toFixed(1)}x`);
    demandCommentary = `The IPO recorded an ${parts2.join(", ")}.`;
  } else if (retailX !== null) {
    demandCommentary = `Retail subscription data is available at ${retailX.toFixed(1)}x. Overall total is pending.`;
  } else {
    demandCommentary = "Subscription data is pending — demand figures are not yet available from current sources.";
  }

  // --- managerCommentary ---
  let managerCommentary: string;
  if (view.manager.leadManagerName) {
    const scoreNote = view.manager.leadManagerScore !== null
      ? ` (track record score: ${view.manager.leadManagerScore.toFixed(0)}/100)`
      : "";
    managerCommentary = `The lead manager is ${view.manager.leadManagerName}${scoreNote}.`;
    if (view.manager.registrarName) {
      managerCommentary += ` The registrar is ${view.manager.registrarName}.`;
    }
  } else {
    managerCommentary = "Lead manager details are being verified from source documents.";
  }

  // --- riskBullets ---
  const riskBullets: string[] = view.risk.risks
    .slice(0, 3)
    .map((r) => r.title);

  // --- sectionsToShow ---
  const sectionsToShow = {
    company:
      view.company.description !== null ||
      view.company.sector !== null ||
      view.company.productsServices !== null,
    valuation: ipoPE !== null || peerAvgPE !== null || view.valuation.peerRows.length > 0,
    financials:
      view.financials.latestRevenue !== null ||
      view.financials.latestPAT !== null ||
      view.financials.yearlyRows.length > 0,
    peerComparison: view.valuation.peerRows.length > 0,
    demand:
      totalX !== null ||
      retailX !== null ||
      view.demand.subscriptionTable.some((r) => r.times !== null),
    manager: view.manager.leadManagerName !== null || view.manager.registrarName !== null,
    risks: view.risk.risks.length > 0,
    rawAudit: view.rawAudit.length > 0,
  };

  return {
    simpleSummary,
    companyBullets,
    valuationCommentary,
    financialCommentary,
    demandCommentary,
    managerCommentary,
    riskBullets,
    sectionsToShow,
  };
}
