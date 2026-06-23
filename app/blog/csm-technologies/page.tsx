import type { Metadata } from "next";
import Link from "next/link";
import BlogSubscribeCallout from "@/components/ui/BlogSubscribeCallout";

export const metadata: Metadata = {
  title: "CSM Technologies IPO — Should You Apply? Score: 49/100 | IPO Lens",
  description: "Detailed CSM Technologies IPO review: analysis of government GovTech dependency, CMMi Level 5 status, global operations, price band (₹107 - ₹113), and listing Day 3 subscription strategy.",
};

export default function CsmTechnologiesIpoBlog() {
  return (
    <>
      {/* HERO */}
      <section className="blog-hero">
        <div className="blog-hero-inner shell blog-article-layout">
          <div>
            <span className="blog-hero-eyebrow">⚙️ Mainboard IPO Review</span>
            <h1>CSM Technologies IPO — Should You Apply? Score: 49/100</h1>
            <p className="blog-hero-sub">
              GovTech provider CSM Technologies is listing with a ₹146 Cr issue. Backed by steady e-governance client relationships across 14 countries, but limited by slow revenue growth (8%) and high working capital DSO, here is why it earns a Neutral score of 49/100.
            </p>
            <div className="blog-hero-meta">
              <span>📅 June 23, 2026</span>
              <span className="dot" />
              <span>⏱ 6 min read</span>
              <span className="dot" />
              <span>🏷 IPO Review · CSM Technologies · GovTech · CMMi Level 5</span>
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "var(--amber)", fontWeight: 700 }}>
                <span className="dot" style={{ display: "inline-block", width: "8px", height: "8px", background: "var(--amber)", borderRadius: "50%" }}></span> Neutral Signal
              </span>
            </div>
            
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "56px", fontWeight: 950, letterSpacing: "-0.04em", color: "#ffffff", lineHeight: 1 }}>49</span>
              <span style={{ fontSize: "20px", color: "rgba(255,255,255,0.4)" }}>/100</span>
            </div>
            <div style={{
              display: "inline-block",
              background: "rgba(245, 158, 11, 0.15)",
              color: "var(--amber)",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 800,
              marginBottom: "20px"
            }}>
              Wait and Watch
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ display: "block", fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, marginBottom: "2px" }}>Valuation P/E</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--amber)" }}>28.5x (Aggressive)</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ display: "block", fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, marginBottom: "2px" }}>Estimated GMP</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--amber)" }}>+5% Premium</span>
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
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 700 }}>Revenue Growth</small>
                <b style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>8.1% YoY</b>
              </div>
              <div>
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 700 }}>Issue Size</small>
                <b style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>₹146 Cr</b>
              </div>
              <div>
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 700 }}>Govt Dependency</small>
                <b style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>85%</b>
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
              <strong>CSM Technologies Limited is launching its Mainboard IPO with a total issue size of ₹146 Crore.</strong> Specializing in GovTech, e-governance systems, and digital infrastructure consultancy, CSM is a key digital transformation partner for government agencies in India and internationally.
            </p>

            <p>
              However, GovTech consulting differs significantly from commercial software-as-a-service (SaaS) or commercial IT services. E-governance bids feature long payment cycles, low gross margins, and high competition, resulting in slow growth metrics. With a score of <strong>49/100</strong>, we break down why a "wait-and-watch" approach is recommended.
            </p>

            <div className="blog-callout blog-callout-warning" style={{ background: "var(--amber-soft)", borderLeftColor: "var(--amber)" }}>
              <p>
                <strong>IPO Lens Verdict:</strong> Earning a <strong>49/100</strong> score, CSM Technologies triggers a <strong>Neutral</strong> signal. Its steady order book is offset by high working capital constraints and expensive pricing relative to peers.
              </p>
            </div>

            <h2 id="ipo-details">CSM Technologies IPO: Key Details</h2>
            <div style={{ overflowX: "auto", margin: "20px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700", width: "180px" }}>Issue Period</td>
                    <td style={{ padding: "10px" }}>June 24, 2026 to June 29, 2026</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Price Band</td>
                    <td style={{ padding: "10px" }}>₹107 to ₹113 per share</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Lot Size</td>
                    <td style={{ padding: "10px" }}>132 Shares (Min. Investment: ₹14,916)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Issue Size</td>
                    <td style={{ padding: "10px" }}>₹146 Crores (100% Fresh Issue)</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Listing Exchange</td>
                    <td style={{ padding: "10px" }}>BSE / NSE Mainboard</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Registrar</td>
                    <td style={{ padding: "10px" }}>KFin Technologies Limited</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2 id="business-profile">About CSM Technologies: GovTech Focus & Global Reach</h2>
            <p>
              Incorporated in 1998 and headquartered in Bhubaneswar, Odisha, CSM Technologies has spent over 27 years developing e-governance solutions, IT consultancy applications, and automation systems for government departments, PSUs, and corporate clients.
            </p>
            <p>
              Unlike standard IT consultancies focused purely on domestic markets, CSM has developed a strong global footprint. It operates across 14 countries—developing Grievance Redressal systems, Student Scholarship distribution boards, and Mining lease automation systems in India, the USA, Canada, and several African nations including Kenya, Ethiopia, Rwanda, Gabon, and Cape Verde.
            </p>
            <p>
              As a certified CMMi Level 5 software provider, CSM brings solid tech credentials. However, tender-based government contracts (awarded to the lowest L1 bidder) squeeze margin potential. Delayed state approvals also trigger long receivable DSO timelines, requiring high working capital buffers.
            </p>

            <h2 id="financials">Financial Performance Check</h2>
            <p>
              The financials for CSM Technologies show modest expansion. Revenue growth has slowed down in the most recent fiscal year, and working capital cycles have stretched:
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
                    <td style={{ padding: "10px" }}>₹245.20</td>
                    <td style={{ padding: "10px" }}>₹280.50</td>
                    <td style={{ padding: "10px" }}>₹303.20</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Net Profit / PAT (in Cr)</td>
                    <td style={{ padding: "10px" }}>₹14.20</td>
                    <td style={{ padding: "10px" }}>₹18.90</td>
                    <td style={{ padding: "10px" }}>₹19.20</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Trade Receivables (in Cr)</td>
                    <td style={{ padding: "10px" }}>₹68.40</td>
                    <td style={{ padding: "10px" }}>₹95.20</td>
                    <td style={{ padding: "10px" }}>₹124.60</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px", fontWeight: "700" }}>Receivable Days (DSO)</td>
                    <td style={{ padding: "10px" }}>101 Days</td>
                    <td style={{ padding: "10px" }}>124 Days</td>
                    <td style={{ padding: "10px" }}>150 Days</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              <strong>The Red Flag:</strong> Trade receivables have spiked from ₹68 Cr to ₹124 Cr. It now takes CSM 150 days on average to collect cash after billing a client. This delays cash flows and forces the company to use its IPO fresh issue to pay down short-term working capital debt rather than reinvesting in software R&D.
            </p>

            <h2 id="why-49">Why the Score is 49/100 (Drivers)</h2>
            <ul>
              <li><strong>Aggressive Pricing (Valuation):</strong> At the upper price band of ₹113, the implied post-issue P/E ratio is 28.5x. Peer IT consultancies trade at similar ranges but have much shorter DSO timelines. Setting CSM at 28x leaves no safety margin for retail investors.</li>
              <li><strong>Weak Topline Growth:</strong> FY26 revenue grew by only 8.1% compared to 14.4% in the prior year, suggesting a plateau in state government order pipeline sizes.</li>
              <li><strong>Muted GMP Sentiment:</strong> Initial grey market premium quotes sit at a flat ₹5 per share (+4.4% premium). There is very little speculative excitement surrounding the issue.</li>
            </ul>

            <h2 id="key-risks">Major Risk Factors</h2>
            <div className="blog-callout blog-callout-warning" style={{ background: "var(--red-soft)", borderLeftColor: "var(--red)" }}>
              <p>
                <strong>1. Extreme Government Client Concentration:</strong> 85% of order pipelines depend directly on state government digitization budget allocations. Political policy changes or transitions between administrations can pause active contracts.
              </p>
              <p style={{ marginTop: "10px" }}>
                <strong>2. Working Capital Stretches:</strong> The consistent increase in Days Sales Outstanding (DSO) to 150 days limits organic cash availability, restricting profitability expansion.
              </p>
            </div>

            <h2 id="verdict">Verdict & Apply Strategy</h2>
            <p>
              <strong>Avoid on Day 1 and Day 2. Apply on Day 3 ONLY IF QIB demand exceeds 10x.</strong>
            </p>
            <p>
              Due to aggressive pricing and slow topline expansion, CSM Technologies is unlikely to deliver listing gains unless institutional buying triggers a squeeze. If Qualified Institutional Buyers (QIBs) heavily oversubscribe the issue on the final day, it may list at a small premium. Otherwise, wait for it to list and watch for a correction before entering.
            </p>

            {/* In-blog subscription box */}
            <BlogSubscribeCallout 
              title="🚀 Get Real-Time Subscription Data & Allotment Indicators"
              description="We track QIB, NII, and Retail subscription percentages hourly. Don't guess — let data guide your IPO bids."
            />
          </article>
        </div>
      </main>
    </>
  );
}
