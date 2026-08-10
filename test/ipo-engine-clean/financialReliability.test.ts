import { describe, expect, it } from "vitest";
import { matchIPONameClean, scoreIPONameCandidate } from "@/lib/ipo-engine-clean/matchIPONameClean";
import { normalizeIPONameClean, sanitizeIPONameClean } from "@/lib/ipo-engine-clean/normalizeIPONameClean";
import { normalizeFinancialTable } from "@/lib/ipo-engine-clean/financials/normalizeFinancialTable";
import { parseIPOPlatformBasePage } from "@/lib/ipo-engine-clean/providers/ipoPlatformProvider";
import { verifySourceIdentity } from "@/lib/ipo-engine-clean/verifySourceIdentity";
import { detectFinancialUnitFromHTML } from "@/lib/ipo-engine-clean/financials/detectFinancialUnit";

describe("financial ingestion identity matching", () => {
  it("removes provider annotations without changing canonical issuer tokens", () => {
    expect(normalizeIPONameClean("G.V.Electricals Ltd. (G.V. Electricals IPO) O")).toBe("g v electricals");
    expect(sanitizeIPONameClean("H.R.Hygiene Products Ltd. (H.R. Hygiene Products IPO) CT")).toBe("H.R.Hygiene Products Ltd.");
    expect(normalizeIPONameClean("SBI Funds Management Ltd (Tentative dates and price)")).toBe("sbi funds management");
  });

  it("tolerates singular and plural provider variants without changing normalized aliases", () => {
    expect(normalizeIPONameClean("Susan Electricals India Limited IPO")).toBe("susan electricals india");
    expect(scoreIPONameCandidate("GV Electrical Limited", "G.V. Electricals Ltd").score).toBeGreaterThanOrEqual(90);
  });

  it("refuses an ambiguous partial name", () => {
    const result = matchIPONameClean({
      aliases: [],
      existingIpos: [
        { id: "one", name: "Nova Industries One Limited" },
        { id: "two", name: "Nova Industries Two Limited" },
      ],
      rawName: "Nova Industries",
    });
    expect(result.ipoId).toBeNull();
    expect(result.reason.toLowerCase()).toContain("ambiguous");
  });

  it("uses issue dates to disambiguate similar names", () => {
    const result = matchIPONameClean({
      aliases: [],
      closeDate: "2026-08-14",
      existingIpos: [
        { close_date: "2026-08-14", id: "holdings", name: "Apex Energy Holdings Limited" },
        { close_date: "2026-02-10", id: "systems", name: "Apex Energy Systems Limited" },
      ],
      rawName: "Apex Energy",
    });
    expect(result.ipoId).toBe("holdings");
    expect(result.confidence).toBeGreaterThanOrEqual(82);
  });

  it("requires a corroborating title, heading, or URL before accepting body text", () => {
    const wrongPage = `
      <html><head><title>Peer comparison directory</title></head>
      <body><h1>Other Issuer Limited IPO</h1><p>Molbio Diagnostics appears in the peer table.</p></body></html>
    `;
    expect(verifySourceIdentity({ html: wrongPage, ipoName: "Molbio Diagnostics Limited" }).accepted).toBe(false);

    const correctPage = `<html><head><title>Molbio Diagnostics IPO Details</title></head><body><h1>Molbio Diagnostics Limited</h1></body></html>`;
    expect(verifySourceIdentity({ html: correctPage, ipoName: "Molbio Diagnostics Limited" }).accepted).toBe(true);
  });
});

describe("financial table normalization", () => {
  it("detects an explicit lakh unit around a financial table", () => {
    const table = [{ Particulars: "Revenue", "FY25": "12500" }, { Particulars: "PAT", "FY25": "1250" }];
    const html = `<h2>Financials (Rs. in Lakhs)</h2><table><tr><td>Revenue</td><td>12500</td></tr></table>`;
    expect(detectFinancialUnitFromHTML(html, table)).toMatchObject({ unit: "lakh" });
  });

  it("corroborates an otherwise unlabeled table from repeated crore values", () => {
    const table = [{ Particulars: "Revenue", "FY25": "156.41" }, { Particulars: "PAT", "FY25": "10.47" }];
    const html = `<table><tr><th>Particulars (₹)</th><th>FY25</th></tr><tr><td>Revenue</td><td>156.41</td></tr><tr><td>PAT</td><td>10.47</td></tr></table><p>Revenue ₹156.41 Cr. PAT ₹10.47 Cr.</p>`;
    const result = detectFinancialUnitFromHTML(html, table);
    expect(result.unit).toBe("crore");
    expect(result.evidence).toContain("2 financial values");
  });

  it("does not infer a unit from a single coincidental amount", () => {
    const table = [{ Particulars: "Revenue", "FY25": "156.41" }, { Particulars: "PAT", "FY25": "10.47" }];
    expect(detectFinancialUnitFromHTML(`<p>Issue size ₹156.41 Cr.</p>`, table).unit).toBeNull();
  });

  it("normalizes a transposed crore table and derives margins", () => {
    const result = normalizeFinancialTable([
      { Particulars: "Revenue", "FY 2024": "100.00", "FY 2025": "150.00" },
      { Particulars: "Profit After Tax", "FY 2024": "10.00", "FY 2025": "18.00" },
      { Particulars: "Total Assets", "FY 2024": "80.00", "FY 2025": "120.00" },
    ], { unit: "crore" });

    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]).toMatchObject({
      financial_year: "2025",
      pat_cr: 18,
      pat_margin_pct: 12,
      revenue_cr: 150,
      total_assets_cr: 120,
    });
  });

  it("normalizes standard rows stated in lakh to crore", () => {
    const result = normalizeFinancialTable([
      { financial_year: "FY26", revenue_cr: "12,500", pat_cr: "1,250", total_assets_cr: "9,000" },
      { financial_year: "FY25", revenue_cr: "10,000", pat_cr: "900", total_assets_cr: "8,000" },
    ], { unit: "lakh" });

    expect(result.rows[0]).toMatchObject({ financial_year: "2025", pat_cr: 9, revenue_cr: 100 });
    expect(result.rows[1]).toMatchObject({ financial_year: "2026", pat_cr: 12.5, revenue_cr: 125 });
  });

  it("keeps total income distinct from revenue from operations", () => {
    const result = normalizeFinancialTable([
      { Particulars: "Total Income", "FY 2025": "1,027.94" },
      { Particulars: "Profit After Tax", "FY 2025": "138.58" },
    ], { unit: "crore" });
    expect(result.rows[0]).toMatchObject({
      financial_year: "2025",
      pat_cr: 138.58,
      revenue_cr: null,
      total_income_cr: 1027.94,
    });
  });

  it("rejects sparse or impossible financial rows", () => {
    const result = normalizeFinancialTable([
      { financial_year: "FY25", revenue_cr: "-10", pat_cr: "2" },
      { financial_year: "FY24", revenue_cr: "100" },
    ], { unit: "crore" });
    expect(result.rows).toHaveLength(0);
    expect(result.rejectedRows).toHaveLength(2);
  });

  it("rejects a source row whose PAT or EBITDA exceeds revenue", () => {
    const result = normalizeFinancialTable([
      { Particulars: "Revenue", "FY26": "53.40" },
      { Particulars: "EBITDA", "FY26": "101.32" },
      { Particulars: "PAT", "FY26": "64.64" },
    ], { unit: "crore" });
    expect(result.rows).toHaveLength(0);
    expect(result.rejectedRows[0]?.reason).toMatch(/exceeds 100%/i);
  });

  it("extracts financial highlights directly from an IPOPlatform base page", () => {
    const html = `
      <h1>Molbio Diagnostics Limited IPO</h1>
      <h2>Financial Performance (₹ Crore)</h2>
      <table>
        <tr><th>Particulars</th><th>FY 2024</th><th>FY 2025</th></tr>
        <tr><td>Revenue</td><td>120</td><td>155</td></tr>
        <tr><td>Profit After Tax</td><td>14</td><td>19</td></tr>
        <tr><td>Total Assets</td><td>90</td><td>112</td></tr>
      </table>
    `;
    const result = parseIPOPlatformBasePage(html, "Molbio Diagnostics Limited");
    expect(result.facts.find((fact) => fact.factKey === "financial_table")?.factValue).toBeTruthy();
    expect(result.facts.find((fact) => fact.factKey === "revenue_latest")?.factValue).toBe(155);
  });
});
