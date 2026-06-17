import Link from "next/link";

export const metadata = {
  title: "Risk Disclosure Statement — IPO Lens",
  description: "Understand the financial, listing, allotment, and regulatory risks associated with IPO investing.",
};

export default function RiskDisclosurePage() {
  const lastUpdated = "June 17, 2026";

  return (
    <main style={{ padding: "48px 24px 72px" }}>
      <div className="shell" style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        <header style={{ marginBottom: "32px", borderBottom: "1px solid var(--line)", paddingBottom: "20px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: "var(--ink)", letterSpacing: "-0.04em", lineHeight: "1.15" }}>Risk Disclosure Statement</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>Last Updated: {lastUpdated}</p>
        </header>

        <article style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text)", display: "grid", gap: "24px" }}>
          <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--ink)" }}>
            IPO investing involves substantial risks. Before applying for any IPO, you must carefully evaluate the following disclosures:
          </p>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>1. Market & Listing Price Volatility</h2>
            <p>
              The listed trading price of shares can fall significantly below the issue price on the listing day or in subsequent trading sessions. Broad market conditions, economic shifts, or sector momentum can impact the debut performance negatively.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>2. Share Allotment Risk</h2>
            <p>
              Submitting an application for an IPO does not guarantee share allotment. In highly oversubscribed issues, retail applications are randomized by the registrar, and you may receive zero allotment or a minor fraction of the requested shares.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>3. Grey Market Premium (GMP) Risks</h2>
            <p>
              Grey Market Premium (GMP) is completely unofficial and speculative. It can change rapidly, be artificially inflated, or manipulated by offline syndicates. It does not correlate reliably with post-listing long-term returns or listing-day outcomes.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>4. Oversubscription Fallacy</h2>
            <p>
              High subscription figures (QIB, NII, or retail) indicate short-term demand but do not guarantee listing gains or positive long-term business performance once the company trades on the open market.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>5. SME-Specific segment Volatility</h2>
            <p>
              SME IPOs pose higher liquidity risks, wider bid-ask spreads, and lower public transparency than mainboard listings. Regulatory bodies like SEBI have issued warnings regarding risk factors in SME companies, advising investors to verify misleading statements.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>6. Valuation & Fundamental Risk</h2>
            <p>
              IPOs are frequently priced at expensive PE or PB valuations compared to listed peers to maximize proceeds for promoters. The company may have a limited history of operational profitability or cash flows.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>7. AI Summary Hallucinations</h2>
            <p>
              AI-generated summaries on this website may omit crucial footnotes, risk disclosures, or litigation details from the DRHP/RHP. Users must not rely solely on automated summary outputs.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>8. No Suitability Checks</h2>
            <p>
              IPO Lens does not evaluate your income, financial goals, risk appetite, or portfolio allocation. You are responsible for consulting a qualified professional to assess the suitability of any IPO investment.
            </p>
          </section>

        </article>
      </div>
    </main>
  );
}
