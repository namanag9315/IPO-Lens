import Link from "next/link";

export const metadata = {
  title: "Data Sources & Methodology — IPO Lens",
  description: "Learn about the data sources, scoring systems, grey market premium (GMP) aggregation, and parsing algorithms behind IPO Lens.",
};

export default function MethodologyPage() {
  const lastUpdated = "June 17, 2026";

  return (
    <main style={{ padding: "48px 24px 72px" }}>
      <div className="shell" style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        <header style={{ marginBottom: "32px", borderBottom: "1px solid var(--line)", paddingBottom: "20px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: "var(--ink)", letterSpacing: "-0.04em", lineHeight: "1.15" }}>Data Sources & Methodology</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>Last Updated: {lastUpdated}</p>
        </header>

        <article style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text)", display: "grid", gap: "24px" }}>
          <p>
            IPO Lens aggregates IPO-related information from publicly available and third-party sources. We strive to process this data transparently so that retail investors can review and verify company financials, objects, and market metrics in a unified format.
          </p>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>1. Data Sources</h2>
            <p>
              IPO Lens extracts and aggregates data from the following public and official sources:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li><strong>SEBI Public Registry:</strong> Public issue filings containing Draft Red Herring Prospectuses (DRHP), Red Herring Prospectuses (RHP), and final offer documents.</li>
              <li><strong>Stock Exchanges (NSE and BSE):</strong> Public issue pages, bidding metrics, and historical listing databases.</li>
              <li><strong>SME Exchange Disclosures:</strong> Specialized SME-segment filings and platform boards.</li>
              <li><strong>Registrar Platforms:</strong> Official registrars (e.g., Link Intime, KFintech) for subscription records and allotment status updates.</li>
              <li><strong>Market Data Feeds:</strong> Third-party providers for grey market metrics and index trackers.</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>2. Data Extraction and Processing</h2>
            <p>
              To structure raw public PDFs and feeds, we use:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li><strong>API Integrations:</strong> Directly syncing index rates (Nifty 50, Sensex) and official listing statuses.</li>
              <li><strong>Document & Table Parsers:</strong> Extracting financial tables, balance sheet parameters, and peer comparisons from RHP documents.</li>
              <li><strong>AI-assisted Extraction:</strong> Summarizing textual objects, promoter information, and lead manager history.</li>
              <li><strong>Internal Rule Engines:</strong> Cross-validating totals (e.g., matching issue size with fresh issue vs. offer for sale limits).</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>3. The IPO Lens Score</h2>
            <p>
              The IPO Lens Score is a rule-based educational indicator designed to simplify initial research. It is not an investment recommendation. The score considers factors such as:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li><strong>Financial Momentum:</strong> Revenue growth, EBITDA margins, and debt-to-equity levels.</li>
              <li><strong>Valuation Comfort:</strong> Price-to-Earnings (P/E) ratios compared with listed peer averages.</li>
              <li><strong>Market Demand:</strong> Real-time subscription bidding metrics and grey market momentum.</li>
              <li><strong>Issue Governance:</strong> Lead manager history and anchor information where available.</li>
              <li><strong>SME Specific Adjustments:</strong> High liquidity risks and scale discounts applied to SME IPOs.</li>
            </ul>
            <p>
              The exact formula and weightings may change over time as we improve our parsing algorithms and capture more historical trends.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>4. Score Interpretation</h2>
            <p>
              <strong>A high score does not guarantee listing gains or positive returns. A low score does not guarantee poor listing performance.</strong>
            </p>
            <p>
              Scores are intended solely as structured reference markers based on historical rules, helping you filter and categorize IPO attributes. They are not a substitute for checking the detailed prospectus and consulting a qualified SEBI-registered professional.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>5. Data Freshness and Timestamps</h2>
            <p>
              Because bidding metrics and Grey Market Premiums change throughout the day, IPO Lens displays &quot;Last Updated&quot; timestamps on every card. In rare circumstances, upstream feeds may experience delays. Always verify the final figures from official exchange dashboards before the issue closes.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>6. Grey Market Premium (GMP) Aggregation</h2>
            <p>
              Grey Market Premium (GMP) is unofficial, unregulated trade estimate feedback. IPO Lens aggregates these parameters from multiple public platforms for informational purposes. GMP does not represent official trading, can be manipulated by market operators, and should not be relied upon as a predictor of listing prices.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>7. No Direct Investment Advice</h2>
            <p>
              IPO Lens operates under strict non-advisory parameters. We do not provide buy, sell, hold, or apply recommendations. We do not assess your personal risk profile, financial goals, or liquidity limits. All data is for educational review only.
            </p>
          </section>

        </article>
      </div>
    </main>
  );
}
