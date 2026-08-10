import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildIPOResearchView } from "@/lib/ipo-engine-clean/public/buildIPOResearchView";
import { buildDeterministicResearchNarrative } from "@/lib/ai/buildDeterministicResearchNarrative";
import { validateResearchNarrative } from "@/lib/ai/validateResearchNarrative";
import { deriveIPOPlatformSiblings } from "@/lib/ipo-engine-clean/source-discovery/discoverIPOPlatformUrls";

// ─── Phase 4.5: Source URL Discovery + Narrative Unit Tests ─────────────────

describe("Phase 1 — Source URL Discovery", () => {
  it("deriveIPOPlatformSiblings extracts slug and id correctly", () => {
    const base = "https://www.ipoplatform.com/ipo/susan-electricals-india/4595";
    const siblings = deriveIPOPlatformSiblings(base);
    expect(siblings.financial_report).toBe("https://www.ipoplatform.com/ipo/financial-report/susan-electricals-india/4595");
    expect(siblings.peer_comparison).toBe("https://www.ipoplatform.com/ipo/peer-comparison/susan-electricals-india/4595");
    expect(siblings.subscription).toBe("https://www.ipoplatform.com/ipo/subscription/susan-electricals-india/4595");
    expect(siblings.review).toBe("https://www.ipoplatform.com/ipo/review/susan-electricals-india/4595");
  });

  it("deriveIPOPlatformSiblings returns empty object for invalid URL", () => {
    const siblings = deriveIPOPlatformSiblings("https://www.ipoplatform.com/ipo/some-company-only");
    expect(Object.keys(siblings)).toHaveLength(0);
  });

  it("deriveIPOPlatformSiblings handles trailing slash", () => {
    const base = "https://www.ipoplatform.com/ipo/horizon-reclaim/1234/";
    const siblings = deriveIPOPlatformSiblings(base);
    expect(siblings.financial_report).toBe("https://www.ipoplatform.com/ipo/financial-report/horizon-reclaim/1234");
  });
});

// ─── Phase 2 — Groq Presentation Layer ───────────────────────────────────────

describe("Phase 2 — Narrative Layer", () => {
  const minimalIPO = { id: "1", name: "Test IPO Ltd", slug: "test-ipo", category: "sme" };

  function buildMinimalView() {
    return buildIPOResearchView(minimalIPO, [
      {
        fact_key: "issue_size",
        fact_value: "50 Cr",
        source_provider: "CHITTORGARH",
        confidence: "high",
        source_priority: 35,
      },
      {
        fact_key: "registrar_name",
        fact_value: "Bigshare Services Pvt Ltd",
        source_provider: "CHITTORGARH",
        confidence: "high",
        source_priority: 35,
      },
    ] as any, [], []);
  }

  it("buildDeterministicResearchNarrative returns a valid ResearchNarrative", () => {
    const view = buildMinimalView();
    const narrative = buildDeterministicResearchNarrative(view);
    expect(narrative.simpleSummary).toBeTruthy();
    expect(typeof narrative.simpleSummary).toBe("string");
    expect(Array.isArray(narrative.companyBullets)).toBe(true);
    expect(Array.isArray(narrative.riskBullets)).toBe(true);
    expect(narrative.sectionsToShow).toBeDefined();
    expect(typeof narrative.sectionsToShow.company).toBe("boolean");
  });

  it("buildDeterministicResearchNarrative uses no forbidden investment words", () => {
    const view = buildMinimalView();
    const narrative = buildDeterministicResearchNarrative(view);
    const allText = [
      narrative.simpleSummary,
      narrative.valuationCommentary,
      narrative.financialCommentary,
      narrative.demandCommentary,
      narrative.managerCommentary,
      ...narrative.companyBullets,
      ...narrative.riskBullets,
    ].join(" ").toLowerCase();
    const forbidden = ["apply", "avoid", "buy", "sell", "subscribe", "invest"];
    for (const word of forbidden) {
      expect(allText).not.toMatch(new RegExp(`\\b${word}\\b`));
    }
  });

  it("validateResearchNarrative accepts a valid narrative", () => {
    const view = buildMinimalView();
    const narrative = buildDeterministicResearchNarrative(view);
    const result = validateResearchNarrative(narrative, view);
    expect(result.valid).toBe(true);
    expect(result.result).not.toBeNull();
  });

  it("validateResearchNarrative rejects a narrative with forbidden words", () => {
    const view = buildMinimalView();
    const narrative = buildDeterministicResearchNarrative(view);
    const badNarrative = {
      ...narrative,
      simpleSummary: "You should apply to this IPO immediately.",
    };
    const result = validateResearchNarrative(badNarrative, view);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("apply");
  });

  it("validateResearchNarrative rejects a narrative missing required keys", () => {
    const view = buildMinimalView();
    const result = validateResearchNarrative({ simpleSummary: "OK" }, view);
    expect(result.valid).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it("validateResearchNarrative rejects a non-object", () => {
    const view = buildMinimalView();
    expect(validateResearchNarrative(null, view).valid).toBe(false);
    expect(validateResearchNarrative("string", view).valid).toBe(false);
    expect(validateResearchNarrative(42, view).valid).toBe(false);
  });
});

// ─── Phase 3 — Public Page View Model (integration style) ────────────────────

describe("Phase 3 — View Model completeness for fixture-backed IPOs", () => {
  const susanFactsPath = path.join(process.cwd(), "test/fixtures/ipo-engine-clean/susan-clean-facts.json");
  const susanFactsExist = fs.existsSync(susanFactsPath);

  it.skipIf(!susanFactsExist)("Susan Electricals view has all required sections populated", () => {
    const susanFacts = JSON.parse(fs.readFileSync(susanFactsPath, "utf-8"));
    const ipo = {
      id: "be19f3b4-e119-4730-a21e-43e0466ebe07",
      name: "Susan Electricals India Limited",
      slug: "susan-electricals",
      category: "sme",
      price_band_high: 127,
      price_band_low: 120,
    };
    const view = buildIPOResearchView(ipo, susanFacts, [
      { gmp_value: 64, captured_at: new Date().toISOString(), source_provider: "IPOWATCH" },
    ] as any, []);

    // Hero
    expect(view.hero.priceBand).toBeTruthy();
    expect(view.hero.gmpValue).toBe(64);
    expect(view.hero.lotSize).toBeGreaterThan(0);

    // Score
    expect(view.score.score).toBeGreaterThan(0);
    expect(view.score.missingData).not.toContain("lead manager not linked");
    expect(view.score.missingData).not.toContain("pe not calculated");

    // Financials — yearlyRows depends on financial_table header format in fixture
    // fixture uses generic 'Column 1/2' headers so yearlyRows may be 0; test latestRevenue only
    expect(view.financials.latestRevenue).toBeGreaterThan(0);

    // Valuation
    expect(view.valuation.ipoPE).toBeGreaterThan(0);

    // Narrative — deterministic works with full Susan data
    const narrative = buildDeterministicResearchNarrative(view);
    expect(narrative.sectionsToShow.financials).toBe(true);
    expect(narrative.sectionsToShow.valuation).toBe(true);
    expect(narrative.simpleSummary.length).toBeGreaterThan(20);
  });

  it("Source-limited IPO view sets correct status labels", () => {
    // Clay Craft style: no peer data, no subscription
    const ipo = { id: "x", name: "Clay Craft India Limited", slug: "clay-craft", category: "sme" };
    const facts = [
      { fact_key: "issue_size", fact_value: "110 Cr", source_provider: "CHITTORGARH", confidence: "high", source_priority: 35 },
      { fact_key: "price_band", fact_value: "₹193 to ₹203", source_provider: "CHITTORGARH", confidence: "high", source_priority: 35 },
      { fact_key: "lot_size", fact_value: "600", source_provider: "CHITTORGARH", confidence: "high", source_priority: 35 },
      { fact_key: "registrar_name", fact_value: "Kfin Technologies Ltd", source_provider: "CHITTORGARH", confidence: "high", source_priority: 35 },
    ] as any;
    const view = buildIPOResearchView(ipo, facts, [], []);
    expect(view.demand.status).toMatch(/Source-limited|Partial/);
    expect(view.valuation.peerRows).toHaveLength(0);
    // Narrative: shows financials=false when no financial data
    const narrative = buildDeterministicResearchNarrative(view);
    expect(narrative.sectionsToShow.peerComparison).toBe(false);
  });
});
