import Link from "next/link";

export const metadata = {
  title: "Disclaimer — IPO Lens",
  description: "Read the regulatory and informational disclaimer regarding IPO Lens research scoring, GMP data, and AI summaries.",
};

export default function DisclaimerPage() {
  const lastUpdated = "June 17, 2026";

  return (
    <main style={{ padding: "48px 24px 72px" }}>
      <div className="shell" style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        <header style={{ marginBottom: "32px", borderBottom: "1px solid var(--line)", paddingBottom: "20px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: "var(--ink)", letterSpacing: "-0.04em", lineHeight: "1.15" }}>Disclaimer</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>Last Updated: {lastUpdated}</p>
        </header>

        <article style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text)", display: "grid", gap: "24px" }}>
          <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--ink)" }}>
            Please read this Disclaimer carefully before using the IPO Lens website or dashboard.
          </p>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>1. Educational and Informational Purpose Only</h2>
            <p>
              IPO Lens is an informational and educational IPO research platform. The content, scores, signals, summaries, charts, AI responses, grey market premium (GMP) data, subscription data, peer comparisons and other details displayed here are compiled for general educational purposes and to increase investor awareness.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>2. No Regulatory Registration or Advisory Services</h2>
            <p>
              <strong>IPO Lens is not a SEBI-registered investment adviser, research analyst, stock broker, merchant banker, portfolio manager or regulated market intermediary.</strong> 
            </p>
            <p>
              We do not provide personalized stock recommendations, buy/sell/hold calls, or financial planning. None of the reports, scores, or signals should be treated as a direct recommendation to apply for or avoid an IPO.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>3. No Warranty on Data Accuracy</h2>
            <p>
              While we attempt to keep all public datasets up to date, we do not warrant the absolute accuracy, completeness, or timeliness of the information. Users should independently verify all information from official sources, including:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li>SEBI offer document registry (DRHP, RHP, Prospectus)</li>
              <li>Official Stock Exchange portals (NSE and BSE)</li>
              <li>Registrar websites and allotment status links</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>4. Market Risks and Listing Assurances</h2>
            <p>
              IPO investments are subject to high market risks. A high IPO Lens score, positive subscription figures, or strong GMP levels do not guarantee positive listing gains, long-term returns, or guaranteed share allotment.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>5. Grey Market Premium (GMP) Disclaimer</h2>
            <p>
              Grey Market Premium (GMP) is completely unofficial, unregulated, and speculative market feedback. It does not trade on stock exchanges, is not backed by SEBI, and can be highly volatile or manipulated. IPO Lens displays GMP data for educational tracking purposes only.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>6. AI Summary Warnings</h2>
            <p>
              AI-generated summaries, objects of the issue, and Q&A answers are compiled automatically from public documents. AI may produce incomplete summaries or misinterpret source texts. Double-check all key figures with official offer documents.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>7. SME IPO Risk Warning</h2>
            <p>
              SME segment IPOs carry higher risks, lower trading volumes, and wider bid-ask spreads. SEBI has issued investor cautions regarding the risks of trading SME securities, including instances of misleading company announcements. Assess suitability carefully before engaging.
            </p>
          </section>

        </article>
      </div>
    </main>
  );
}
