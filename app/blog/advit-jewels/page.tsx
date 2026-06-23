import type { Metadata } from "next";
import Link from "next/link";
import BlogSubscribeCallout from "@/components/ui/BlogSubscribeCallout";

export const metadata: Metadata = {
  title: "Advit Jewels IPO — Should You Apply? Score: 71/100 | IPO Lens",
  description: "Detailed Advit Jewels IPO review: analysis of financials, ROE (29.7%), fair P/E valuation, customer risks, live GMP premium and subscription strategy.",
};

export default function AdvitJewelsIpoBlog() {
  return (
    <>
      {/* HERO */}
      <section className="blog-hero">
        <div className="blog-hero-inner shell blog-article-layout">
          <div>
            <span className="blog-hero-eyebrow">💎 SME IPO Review</span>
            <h1>Advit Jewels IPO — Should You Apply? Score: 71/100</h1>
            <p className="blog-hero-sub">
              Advit Jewels is launching a ₹18.4 Cr listing. Sporting a strong financial track record, high return ratios (ROE: 29.7%), and a solid research score of 71/100, here is our deep-dive analysis on whether you should apply.
            </p>
            <div className="blog-hero-meta">
              <span>📅 June 23, 2026</span>
              <span className="dot" />
              <span>⏱ 6 min read</span>
              <span className="dot" />
              <span>🏷 IPO Review · Advit Jewels · Jewellery Sector</span>
            </div>
          </div>

          {/* Interactive Score Widget */}
          <div style={{
            background: "linear-gradient(135deg, #071225 0%, #111d40 100%)",
            padding: "28px",
            borderRadius: "20px",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 12px 36px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--blue)" }}>IPO Lens Research</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#10b981", fontWeight: 700 }}>
                <span className="dot" style={{ display: "inline-block", width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }}></span> Positive Signal
              </span>
            </div>
            
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "56px", fontWeight: 950, letterSpacing: "-0.04em", color: "#ffffff", lineHeight: 1 }}>71</span>
              <span style={{ fontSize: "20px", color: "rgba(255,255,255,0.4)" }}>/100</span>
            </div>
            <div style={{
              display: "inline-block",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 800,
              marginBottom: "20px"
            }}>
              High Listing Potential
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ display: "block", fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, marginBottom: "2px" }}>Valuation P/E</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--green)" }}>14.5x (Fair)</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ display: "block", fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, marginBottom: "2px" }}>Estimated GMP</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--green)" }}>+35% Premium</span>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: "15px",
              textAlign: "center",
              gap: "5px"
            }}>
              <div>
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 700 }}>ROE Ratio</small>
                <b style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>29.7%</b>
              </div>
              <div>
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 700 }}>Issue Size</small>
                <b style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>₹18.4 Cr</b>
              </div>
              <div>
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 700 }}>SME Risks</small>
                <b style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>Medium</b>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLE BODY */}
      <main className="blog-article-wrap">
        <div className="shell blog-article-layout">
          <article className="blog-article">
            <p>
              <strong>Advit Jewels Limited is hitting the public market with an IPO of ₹18.43 Crore.</strong> Operating in the highly competitive jewellery manufacturing sector, Advit has managed to post industry-leading growth rates and exceptional return on equity, drawing significant interest in the grey market.
            </p>

            <p>
              Applying for SME IPOs carries inherent liquidity and volatility risks, but the company's solid fundamentals and comfortable valuation make it a standout listing in June 2026. Here is our comprehensive research on the offering.
            </p>

            <div className="blog-callout blog-callout-teal">
              <p>
                <strong>IPO Lens Verdict:</strong> With a score of <strong>71/100</strong>, Advit Jewels triggers a <strong>Positive</strong> research signal. It is backed by consistent profit margins, low debt levels, and reasonable post-issue pricing.
              </p>
            </div>

            <h2 id="ipo-details">Advit Jewels IPO: Key Details</h2>
            <div style={{ overflowX: "auto", margin: "20px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700", width: "180px" }}>Issue Period</td>
                    <td style={{ padding: "10px" }}>June 22, 2026 to June 25, 2026</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Price Band</td>
                    <td style={{ padding: "10px" }}>₹95 to ₹100 per share</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Lot Size</td>
                    <td style={{ padding: "10px" }}>1,200 Shares (Min. Investment: ₹1,20,000)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Issue Size</td>
                    <td style={{ padding: "10px" }}>₹18.43 Crores (Fresh Issue: ₹15.20 Cr, OFS: ₹3.23 Cr)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Listing Exchange</td>
                    <td style={{ padding: "10px" }}>NSE SME</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Registrar</td>
                    <td style={{ padding: "10px" }}>Link Intime India Private Ltd</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 id="business-profile">About Advit Jewels: Business Profile</h2>
            <p>
              Incorporated in Mumbai, Advit Jewels is a designer, manufacturer, and wholesaler of gold, diamond, and silver jewellery. Their catalog ranges from daily wear earrings and rings to heavy bridal sets.
            </p>
            <p>
              The company operates B2B, catering to major retail showrooms across Maharashtra, Gujarat, and Rajasthan. Rather than owning premium retail storefronts, Advit operates a capital-efficient wholesaling model which keeps operational overheads low and asset turnover exceptionally high.
            </p>

            <h2 id="financials">Financial Health Check</h2>
            <p>
              The core strength of Advit Jewels lies in its balance sheet consistency. Unlike many SME issuers that show a sudden revenue spike right before filing their prospectus, Advit’s figures show a steady upward trajectory over three years:
            </p>

            <div style={{ overflowX: "auto", margin: "20px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border-default)", background: "#f8fafc", textAlign: "left" }}>
                    <th style={{ padding: "10px" }}>Financial Metric</th>
                    <th style={{ padding: "10px" }}>FY24</th>
                    <th style={{ padding: "10px" }}>FY25</th>
                    <th style={{ padding: "10px" }}>FY26 (Provisional)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Revenue (in Cr)</td>
                    <td style={{ padding: "10px" }}>₹42.30</td>
                    <td style={{ padding: "10px" }}>₹58.12</td>
                    <td style={{ padding: "10px" }}>₹82.60</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Net Profit / PAT (in Cr)</td>
                    <td style={{ padding: "10px" }}>₹1.80</td>
                    <td style={{ padding: "10px" }}>₹3.20</td>
                    <td style={{ padding: "10px" }}>₹5.15</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Net Worth (in Cr)</td>
                    <td style={{ padding: "10px" }}>₹6.80</td>
                    <td style={{ padding: "10px" }}>₹10.50</td>
                    <td style={{ padding: "10px" }}>₹17.34</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Debt-to-Equity</td>
                    <td style={{ padding: "10px" }}>0.62</td>
                    <td style={{ padding: "10px" }}>0.48</td>
                    <td style={{ padding: "10px" }}>0.32</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              <strong>Key takeaways:</strong> Revenue grew by 42% in FY26, while profits surged by 60%, showing operational leverage. Debt-to-equity has fallen consistently, leaving ample room to borrow for working capital post-IPO.
            </p>

            <h2 id="why-71">Why the Score is 71/100 (Drivers)</h2>
            <ul>
              <li><strong>Fair Valuation:</strong> At the upper price band of ₹100, the pre-issue P/E ratio is 14.5x based on FY26 earnings. Peer competitors trade at 18x to 22x P/E, giving retail applicants comfortable valuation headroom.</li>
              <li><strong>Excellent ROE & ROCE:</strong> Return on Equity stands at 29.7% for FY26. This indicates management compiles high profits on the capital reinvested into the business.</li>
              <li><strong>Healthy GMP Cushion:</strong> The unofficial Grey Market Premium has hovered around ₹35 per share (a +35% premium). While GMP is highly volatile, it indicates solid initial demand from listing-day speculators.</li>
            </ul>

            <h2 id="key-risks">Key Risks to Keep in Mind</h2>
            <div className="blog-callout blog-callout-warning" style={{ background: "var(--red-soft)", borderLeftColor: "var(--red)" }}>
              <p>
                <strong>1. Customer Concentration:</strong> Advit Jewels gets over 52% of its revenue from its top 5 retail partners. Losing one of these relationships could damage revenue consistency.
              </p>
              <p style={{ marginTop: "10px" }}>
                <strong>2. Commodity Fluctuation:</strong> Rapid spikes or drops in raw gold and silver bullion prices can hit raw material costs before Advit can pass the changes onto its wholesaler networks.
              </p>
            </div>

            <h2 id="verdict">The Verdict: Should You Apply?</h2>
            <p>
              <strong>Yes, for both listing gains and medium-term growth.</strong>
            </p>
            <p>
              Advit Jewels is priced reasonably and has high-quality financials. The debt is low, profits are scaling, and return metrics are excellent. The GMP of 35% offers a safe buffer against minor listing-day market volatility. 
            </p>
            <p>
              We recommend applying for <strong>1 lot</strong> in the retail category if your risk tolerance supports SME IPOs.
            </p>

            {/* In-blog subscription box */}
            <BlogSubscribeCallout title="🔥 Want Live GMP Alerts & Analysis for Advit Jewels?" />
          </article>
        </div>
      </main>
    </>
  );
}
