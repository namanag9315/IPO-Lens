import Link from "next/link";

export const metadata = {
  title: "Terms and Conditions — IPO Lens",
  description: "Read the terms of service governing your access and educational use of the IPO Lens dashboard.",
};

export default function TermsAndConditions() {
  const lastUpdated = "June 17, 2026";
  
  return (
    <main style={{ padding: "48px 24px 72px" }}>
      <div className="shell" style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        <header style={{ marginBottom: "32px", borderBottom: "1px solid var(--line)", paddingBottom: "20px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: "var(--ink)", letterSpacing: "-0.04em", lineHeight: "1.15" }}>Terms and Conditions</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>Last Updated: {lastUpdated}</p>
        </header>

        <article style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text)", display: "grid", gap: "24px" }}>
          <p>
            These Terms and Conditions (“Terms”) govern your access to and use of IPO Lens, including our website, dashboards, IPO tracking tools, research pages, watchlists, newsletters, alerts, AI summaries, and any related services.
          </p>
          <p>
            By accessing or using IPO Lens, you agree to be bound by these Terms. If you do not agree, please do not use the platform.
          </p>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>1. About IPO Lens</h2>
            <p>
              IPO Lens is an informational and educational platform that aggregates and presents publicly available IPO-related information in a simplified manner for retail investors. 
            </p>
            <p>
              The platform displays IPO issue details, subscription data, financial summaries, valuation comparisons, grey market premium (GMP) data, and AI-assisted plain-English summaries along with our rule-based research score.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>2. No Investment Advice (Important Compliance Notice)</h2>
            <p>
              <strong>IPO Lens does not provide personalised investment advice, stock recommendations, research recommendations, financial planning, or any other regulated investment advisory services.</strong>
            </p>
            <p>
              Any content, score, signal, summary, comparison, or response generated on this platform is for general informational and educational purposes only. Users must not treat any information on IPO Lens as:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li>A recommendation to apply for or avoid any specific IPO.</li>
              <li>A buy, sell, or hold recommendation on any securities.</li>
              <li>A guarantee of listing gains, allotment probability, or investment returns.</li>
              <li>A substitute for professional financial planning or investment analysis.</li>
            </ul>
            <p>
              Users should consult a SEBI-registered investment adviser, research analyst, or other qualified financial professionals before making any real-world investment decisions.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>3. Regulatory Status</h2>
            <p>
              <strong>IPO Lens is not registered with SEBI as an Investment Adviser, Research Analyst, Stock Broker, Merchant Banker, or Portfolio Manager.</strong> If any regulatory registration is obtained in the future, relevant details will be displayed transparently on this portal.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>4. User Responsibility & Market Risk</h2>
            <p>By using IPO Lens, you understand and agree that:</p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li>IPO investing involves significant market risk, and the market price can list below the issue price.</li>
              <li>Grey Market Premium (GMP) is unofficial, unregulated, and prone to manipulation.</li>
              <li>High subscription figures do not guarantee positive listing gains.</li>
              <li>A positive IPO Lens score does not guarantee allotment or profits.</li>
              <li>You are solely responsible for your own trading or investment decisions.</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>5. SME IPO Risks</h2>
            <p>
              SME IPOs involve higher risks than mainboard issues due to smaller company size, lower liquidity, business concentration, and higher volatility. SEBI has cautioned investors regarding risks in securities of SME-segment companies, including potential concerns around misleading public announcements and unrealistic pictures of operations in some cases.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>6. AI-Generated Content</h2>
            <p>
              We use AI to summarize IPO documents and objects of the issue. AI content is prone to errors, omissions, and hallucinations. It should not be relied upon for investment choices and must be verified from the original RHP or prospectus filings.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, IPO Lens, its founders, employees, and affiliates shall not be liable for any trading losses, investment losses, missed opportunities, or data inaccuracies arising out of or related to your use of this platform.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>8. Governing Law & Jurisdiction</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of India. Courts in Mumbai, Maharashtra, India shall have exclusive jurisdiction over any disputes arising under these Terms.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>9. Contact Us</h2>
            <p>
              For legal inquiries regarding these Terms, contact us at <a href="mailto:legal@ipolens.in" style={{ color: "var(--blue)" }}>legal@ipolens.in</a>.
            </p>
          </section>

        </article>
      </div>
    </main>
  );
}
