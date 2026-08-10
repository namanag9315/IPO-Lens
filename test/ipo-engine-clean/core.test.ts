import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { canCreateIPO } from "@/lib/ipo-engine-clean/canCreateIPO";
import { buildIPOResearchView } from "@/lib/ipo-engine-clean/public/buildIPOResearchView";
import { cleanLabelText } from "@/lib/ipo-engine-clean/public/factLookup";
import { detectIPOPageContent } from "@/lib/ipo-engine-clean/detectSourceContent";
import { matchIPONameClean } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { normalizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { extractTablesAndText } from "@/lib/ipo-engine-clean/extractTablesAndText";
import { parseChittorgarhDetail } from "@/lib/ipo-engine-clean/providers/chittorgarhProvider";
import { parseFinologyTickerDetail } from "@/lib/ipo-engine-clean/providers/finologyTickerProvider";
import { validateFacts } from "@/lib/ipo-engine-clean/validateFacts";

const existingIpos = [
  { id: "1", name: "Susan Electricals India Limited", slug: "susan-electricals" },
  { id: "2", name: "Clay Craft India Limited", slug: "clay-craft" },
  { id: "3", name: "Horizon Reclaim (India) Limited", slug: "horizon-reclaim" },
];

describe("clean IPO engine core rules", () => {
  it("normalizes legal suffixes without removing meaningful words", () => {
    expect(normalizeIPONameClean("Susan Electricals India Limited IPO")).toBe("susan electricals india");
    expect(normalizeIPONameClean("Leapfrog Engineering Services Ltd")).toBe("leapfrog engineering services");
    expect(normalizeIPONameClean("Horizon Reclaim (India) Pvt Ltd")).toBe("horizon reclaim india");
  });

  it("matches known duplicate name variants to canonical IPOs", () => {
    expect(matchIPONameClean({ aliases: [], existingIpos, rawName: "Susan Electricals India" })).toMatchObject({
      confidence: 100,
      ipoId: "1",
      matchType: "exact",
    });
    expect(matchIPONameClean({ aliases: [], existingIpos, rawName: "Horizon Reclaim India" }).confidence).toBeGreaterThanOrEqual(85);
  });

  it("blocks master creation from non-list providers", () => {
    expect(canCreateIPO({ matchConfidence: 0, provider: "INVESTORGAIN", recordType: "gmp", slugExists: false }).allowed).toBe(false);
    expect(canCreateIPO({ matchConfidence: 0, provider: "IPOWATCH", recordType: "subscription", slugExists: false }).allowed).toBe(false);
    expect(canCreateIPO({ matchConfidence: 0, provider: "CHITTORGARH", recordType: "detail", slugExists: false }).allowed).toBe(false);
  });

  it("allows safe IPO list creation only when duplicate checks pass", () => {
    expect(canCreateIPO({ matchConfidence: 0, provider: "CHITTORGARH", recordType: "ipo_list", slugExists: false }).allowed).toBe(true);
    expect(canCreateIPO({ matchConfidence: 92, provider: "CHITTORGARH", recordType: "ipo_list", slugExists: false }).allowed).toBe(false);
    expect(canCreateIPO({ matchConfidence: 0, provider: "CHITTORGARH", recordType: "ipo_list", slugExists: true }).allowed).toBe(false);
  });

  it("extracts generic tables with nearby headings", () => {
    const html = "<h2>IPO Details</h2><table><tr><th>Field</th><th>Value</th></tr><tr><td>Registrar</td><td>Bigshare Services</td></tr></table>";
    const result = extractTablesAndText(html);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0].nearbyHeading).toBe("IPO Details");
    expect(result.tables[0].rows[0]).toMatchObject({ Field: "Registrar", Value: "Bigshare Services" });
  });

  it("accepts a real Chittorgarh IPO page even when ad text exists", () => {
    const fixture = path.join(process.cwd(), "test/fixtures/ipo-engine-clean/chittorgarh-detail-horizon-reclaim.html");
    const html = fs.readFileSync(fixture, "utf8");
    const detection = detectIPOPageContent({ html, ipoName: "Horizon Reclaim (India)", provider: "CHITTORGARH", text: html });
    const parsed = parseChittorgarhDetail(html, "Horizon Reclaim (India)");
    const validation = validateFacts(parsed.facts);

    expect(detection.isValidIPOPage).toBe(true);
    expect(detection.isInterstitialOnly).toBe(false);
    expect(validation.accepted.map((fact) => fact.factKey)).toContain("ipo_details_table");
    expect(validation.accepted.map((fact) => fact.factKey)).toContain("financial_table");
  });

  it("extracts issue details and financials from a real Finology Ticker page", () => {
    const fixture = path.join(process.cwd(), "test/fixtures/ipo-engine-clean/finology-ticker-detail-horizon-reclaim.html");
    const html = fs.readFileSync(fixture, "utf8");
    const detection = detectIPOPageContent({ html, ipoName: "Horizon Reclaim (India)", provider: "FINOLOGY_TICKER", text: html });
    const parsed = parseFinologyTickerDetail(html, "Horizon Reclaim (India)");
    const acceptedKeys = validateFacts(parsed.facts).accepted.map((fact) => fact.factKey);

    expect(detection.isValidIPOPage).toBe(true);
    expect(acceptedKeys).toContain("ipo_details_table");
    expect(acceptedKeys).toContain("issue_size");
    expect(acceptedKeys).toContain("financial_table");
  });
});

describe("buildIPOResearchView with Susan facts", () => {
  it("builds correct research view and maps required facts", () => {
    const fixturePath = path.join(process.cwd(), "test/fixtures/ipo-engine-clean/susan-clean-facts.json");
    const factRows = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    const ipo = {
      id: "be19f3b4-e119-4730-a21e-43e0466ebe07",
      name: "Susan Electricals India Limited",
      slug: "susan-electricals",
      category: "sme",
      price_band_high: 127,
      price_band_low: 120,
    };

    const gmpHistory = [
      { gmp_value: 64, captured_at: new Date().toISOString(), source_provider: "IPOWATCH" }
    ];

    const view = buildIPOResearchView(ipo, factRows, gmpHistory);

    // 1. buildIPOResearchView maps pe_post_ipo to valuation.ipoPE
    expect(view.valuation.ipoPE).toBe(14.15);

    // 2. buildIPOResearchView maps total_income_latest to financial.latestRevenue
    expect(view.financials.latestRevenue).toBe(269.96);

    // 3. buildIPOResearchView maps subscription_table to offered/applied rows
    const totalRow = view.demand.subscriptionTable.find(r => r.category === "Total");
    expect(totalRow).toBeDefined();

    // 4. buildIPOResearchView fixes GMP percent
    expect(view.hero.gmpValue).toBe(64);
    expect(view.hero.gmpPercent).toBeCloseTo(50.4, 1);
    expect(view.hero.listingEstimate).toBe(191);

    // 5. score does not say lead manager missing when lead_manager_name exists
    expect(view.score.missingData.every(w => !w.toLowerCase().includes("lead manager not linked"))).toBe(true);

    // 6. score does not say IPO PE missing when pe_post_ipo exists
    expect(view.score.missingData.every(w => !w.toLowerCase().includes("pe not calculated"))).toBe(true);

    // 7. sector cleanup removes "SME IPO so far"
    expect(view.company.sector).toBe("Electric Equipments");
  });

  it("removes SME IPO so far from sector text", () => {
    expect(cleanLabelText("Electric Equipments SME IPO so far")).toBe("Electric Equipments");
    expect(cleanLabelText("Electrical equipment / wires & cables Sector Update")).toBe("Electrical equipment / wires & cables");
  });

  it("parses transposed financial table in buildIPOResearchView", () => {
    const ipo = { id: "1", name: "Test IPO", slug: "test" };
    const factRows = [
      {
        fact_key: "financial_table",
        fact_value: [
          {
            "Period Ended": "Assets",
            "31 Mar 2026": "130.05",
            "31 Mar 2025": "73.68"
          },
          {
            "Period Ended": "Total Income",
            "31 Mar 2026": "269.96",
            "31 Mar 2025": "136.05"
          },
          {
            "Period Ended": "Profit After Tax",
            "31 Mar 2026": "18.25",
            "31 Mar 2025": "5.65"
          }
        ],
        source_provider: "CHITTORGARH",
        confidence: "high",
        source_priority: 35
      }
    ];

    const view = buildIPOResearchView(ipo, factRows as any);
    expect(view.financials.yearlyRows).toHaveLength(2);
    expect(view.financials.yearlyRows[0]).toMatchObject({
      financialYear: "31 Mar 2025",
      revenueCr: 136.05,
      patCr: 5.65,
      totalAssetsCr: 73.68
    });
    expect(view.financials.yearlyRows[1]).toMatchObject({
      financialYear: "31 Mar 2026",
      revenueCr: 269.96,
      patCr: 18.25,
      totalAssetsCr: 130.05
    });
  });
});
