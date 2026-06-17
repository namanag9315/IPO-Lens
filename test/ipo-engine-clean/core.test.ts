import { describe, it, expect } from "vitest";
import { buildIPOResearchView, shouldShowSection } from "../../lib/researchView";
import type { ComputedIPO } from "../../types/ipo";

describe("IPO Research View Model Engine", () => {
  const mockIPO: ComputedIPO = {
    id: "test-id",
    slug: "susan-electricals-india",
    name: "Susan Electricals India",
    category: "sme",
    status: "closed",
    price_band_low: 120,
    price_band_high: 127,
    lot_size: 1000,
    issue_size_cr: 70.38,
    open_date: "2026-06-11",
    close_date: "2026-06-15",
    listing_date: "2026-06-18",
    created_at: new Date().toISOString(),
    registrar_name: null,
    fresh_issue_amount: null,
    ofs_amount: null,
    face_value: 10,
    issue_type: null,
    pre_issue_shares: null,
    post_issue_shares: null,
    canonical_ipo_id: null,
    is_duplicate: false,
    duplicate_status: null,
    merged_at: null,
    merge_notes: null,
    admin_verified: false,
    enriched_data: {
      exchange: "BSE SME",
      allotment_date: "2026-06-16",
    },
    gmp_history: [
      { id: "g1", ipo_id: "test-id", gmp_value: 60, source: "test", captured_at: "2026-06-15" },
    ],
    subscription_data: [
      { id: "s1", ipo_id: "test-id", qib_x: 0, nii_x: 0, retail_x: 200, total_x: 216.6, captured_at: "2026-06-15" },
    ],
    ai_analysis: null,
    listing_performance: null,
    latest_gmp: 60,
    latest_subscription: {
      id: "s1",
      ipo_id: "test-id",
      qib_x: 0,
      nii_x: 0,
      retail_x: 200,
      total_x: 216.6,
      captured_at: "2026-06-15",
    },
    estimated_listing_gain_pct: 47.2,
    company_profile: {
      id: "p1",
      ipo_id: "test-id",
      company_overview: "Susan Electricals India manufactures winding wires, power cables, and conductors.",
      business_model: "Winding wires, power cables, conductors",
      sector: "Electricals",
      industry: "Cables",
      headquarters: "Mumbai",
      website: "http://susan.com",
      promoters: "Susan Family",
      pre_issue_promoter_holding_pct: 100,
      post_issue_promoter_holding_pct: 73.2,
      risk_factors: ["Raw material price volatility"],
      source_documents: [],
      updated_at: new Date().toISOString(),
    },
    financials_yearly: [
      {
        id: "f1",
        ipo_id: "test-id",
        financial_year: "31 Mar 2024",
        revenue_cr: 103.59,
        pat_cr: 0.76,
        ebitda_cr: 3.64,
        ebitda_margin_pct: 3.51,
        pat_margin_pct: 0.73,
        net_worth_cr: 6.21,
        total_borrowings_cr: 24.79,
        debt_equity: 3.99,
        eps: 0.5,
        roe_pct: 12.2,
        roce_pct: 11.5,
        created_at: new Date().toISOString(),
      },
      {
        id: "f2",
        ipo_id: "test-id",
        financial_year: "31 Mar 2025",
        revenue_cr: 136.05,
        pat_cr: 5.65,
        ebitda_cr: 12.0,
        ebitda_margin_pct: 8.82,
        pat_margin_pct: 4.15,
        net_worth_cr: 17.98,
        total_borrowings_cr: 45.27,
        debt_equity: 2.52,
        eps: 3.2,
        roe_pct: 31.4,
        roce_pct: 22.8,
        created_at: new Date().toISOString(),
      },
      {
        id: "f3",
        ipo_id: "test-id",
        financial_year: "31 Mar 2026",
        revenue_cr: 269.96,
        pat_cr: 18.25,
        ebitda_cr: 32.08,
        ebitda_margin_pct: 11.91,
        pat_margin_pct: 6.77,
        net_worth_cr: 38.48,
        total_borrowings_cr: 66.72,
        debt_equity: 1.73,
        eps: 9.0,
        roe_pct: 64.64,
        roce_pct: 29.05,
        created_at: new Date().toISOString(),
      },
    ],
    peer_comparisons: [
      {
        id: "pe1",
        ipo_id: "test-id",
        peer_name: "Peer Electricals",
        revenue_cr: 500,
        pat_cr: 45,
        pe_ratio: 25.4,
        pb_ratio: 3.2,
        roe_pct: 18.5,
        roce_pct: 17.2,
        market_cap_cr: 1200,
        notes: null,
        created_at: new Date().toISOString(),
      },
    ],
    objects_of_issue: [],
  };

  it("normalizes IPO details correctly for Hero section", () => {
    const view = buildIPOResearchView(mockIPO);
    expect(view.hero.values.name).toBe("Susan Electricals India");
    expect(view.hero.values.category).toBe("sme");
    expect(view.hero.values.priceBand).toBe("₹120 - ₹127");
    expect(view.hero.values.minInvestment).toBe(254000);
  });

  it("calculates correct deterministic signals", () => {
    const view = buildIPOResearchView(mockIPO);
    const signals = view.quickSignals.values.signals;
    expect(signals.some((s: any) => s.title === "Grey market is bullish")).toBe(true);
    expect(signals.some((s: any) => s.title === "Demand is very high")).toBe(true);
    expect(signals.some((s: any) => s.title === "Priced below peer average")).toBe(true);
    expect(signals.some((s: any) => s.title === "SME liquidity risk")).toBe(true);
  });

  it("calculates financials correctly", () => {
    const view = buildIPOResearchView(mockIPO);
    expect(view.financials.values.latestRevenue).toBe(269.96);
    expect(view.financials.values.revenueGrowth).toBeGreaterThan(0);
    expect(view.financials.values.financials).toHaveLength(3);
    expect(view.financials.values.financials[0].year).toBe("31 Mar 2024");
  });

  it("identifies allotment odds correctly", () => {
    const view = buildIPOResearchView(mockIPO);
    expect(view.demand.values.allotmentChance).toBe(0.5);
  });

  it("evaluates shouldShowSection properly", () => {
    const view = buildIPOResearchView(mockIPO);
    expect(shouldShowSection(view.hero)).toBe(true);
    expect(shouldShowSection(view.quickSignals)).toBe(true);
    expect(shouldShowSection(view.leadManager)).toBe(true); // SME only
  });
});
