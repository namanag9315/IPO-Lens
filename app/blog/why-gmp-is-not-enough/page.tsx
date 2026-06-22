import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Why IPO Lens Does Not Judge IPOs Only by GMP",
  description: "Learn how IPO Lens reads an IPO score beyond GMP by combining subscription demand, financials, valuation, issue structure, risks, SME liquidity and plain-English research signals.",
};

export default function WhyNotOnlyGmpBlogPage() {
  return (
    <>
      {/* HERO */}
      <section className="blog-hero">
        <div className="blog-hero-inner shell blog-article-layout">
          <div>
            <span className="blog-hero-eyebrow">📚 IPO Lens Education</span>
            <h1>Why IPO Lens does not judge IPOs only by GMP</h1>
            <p className="blog-hero-sub">
              A high Grey Market Premium can create excitement, but it cannot explain business quality, valuation comfort, subscription depth, SME liquidity risk, or what the company will actually do with IPO money. That is why IPO Lens uses a broader score.
            </p>
            <div className="blog-hero-meta">
              <span>📅 June 22, 2026</span>
              <span className="dot" />
              <span>⏱ 8 min read</span>
              <span className="dot" />
              <span>🏷 Education · Methodology · Risk Management</span>
            </div>
          </div>

          {/* CSS-based premium mock dashboard widget (No image placeholder!) */}
          <div style={{
            background: "linear-gradient(135deg, #071225 0%, #111d40 100%)",
            padding: "28px",
            borderRadius: "20px",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 12px 36px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--blue)" }}>Featured Signal View</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#10b981", fontWeight: 700 }}>
                <span className="dot" style={{ display: "inline-block", width: "8px", height: "8px", background: "#10b981", borderRadius: "50%" }}></span> Live Research
              </span>
            </div>
            
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "56px", fontWeight: 950, letterSpacing: "-0.04em", color: "#ffffff", lineHeight: 1 }}>73</span>
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
              Positive Research Signal
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ display: "block", fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, marginBottom: "2px" }}>Valuation</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--amber)" }}>Fair / Neutral</span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ display: "block", fontSize: "9px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 700, marginBottom: "2px" }}>Subscription</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--green)" }}>3.5x Demand</span>
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: "15px",
              textAlign: "center",
              gap: "5px"
            }}>
              <div>
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 700 }}>Model</small>
                <b style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>Weighted</b>
              </div>
              <div>
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 700 }}>GMP Weight</small>
                <b style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>Limited</b>
              </div>
              <div>
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 700 }}>SME Caution</small>
                <b style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>Enabled</b>
              </div>
              <div>
                <small style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "9px", textTransform: "uppercase", fontWeight: 700 }}>Litigation</small>
                <b style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>Checked</b>
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
              <strong>Grey Market Premium, or GMP, is usually the first number retail investors look at before applying for an IPO.</strong> It
              is fast, exciting, easy to understand, and directly linked to the hope of listing gains. But it is also unofficial, volatile,
              and incomplete.
            </p>

            <p>
              IPO Lens was built with a simple belief: <strong>IPO research should not be reduced to one noisy number.</strong> A good IPO
              decision needs a broader view — demand, fundamentals, valuation, risks, issue structure, and plain-English explanation.
            </p>

            <div className="blog-callout blog-callout-teal">
              <p>
                <strong>IPO Lens view:</strong> GMP can be useful as a sentiment signal, but it should not become the whole research
                process. A score based only on GMP may reward hype and ignore risk.
              </p>
            </div>

            <h2 id="gmp-basics">First, what exactly is GMP?</h2>
            <p>
              GMP stands for <strong>Grey Market Premium</strong>. It is the unofficial premium at which IPO shares are discussed or traded in
              the grey market before listing. For example, if an IPO has an issue price of ₹100 and the grey market premium is ₹20, traders
              may talk about an implied listing sentiment of around ₹120.
            </p>

            <p>
              But this is not an official exchange price. It is not the final listing price. It is not a guarantee. It is a sentiment
              indicator that can change quickly with market mood, subscription numbers, rumours, and demand-supply conditions.
            </p>

            <div className="blog-callout">
              <p>
                <strong>Beginner takeaway:</strong> GMP tells you what the market may be expecting. It does not tell you whether the
                company is financially strong, fairly valued, or safe for long-term investors.
              </p>
            </div>

            <h2 id="why-gmp-misleads">Why relying only on GMP can mislead investors</h2>
            <p>There are three major problems with judging an IPO only by GMP.</p>

            <h3>1. GMP is unofficial and outside the formal IPO process</h3>
            <p>
              Official IPO data comes from stock exchanges, SEBI filings, registrars, and company offer documents. GMP does not come from
              that formal process. It is generated in an unofficial grey market, where transparency is limited.
            </p>

            <h3>2. GMP may move faster than fundamentals</h3>
            <p>
              GMP can change because of market mood, social media buzz, subscription excitement, or temporary demand. But the company’s
              business quality does not change every few hours. Revenue growth, PAT trend, debt, cash flow, and valuation need slower and
              deeper analysis.
            </p>

            <h3>3. GMP ignores downside risk</h3>
            <p>
              A high GMP may make an IPO look attractive, but it does not automatically reveal customer concentration, high debt, weak
              profits, aggressive valuation, SME liquidity issues, or poor use of IPO proceeds.
            </p>

            {/* CSS-based premium mini-dashboard (No image placeholder!) */}
            <div style={{
              background: "#fafbfc",
              border: "1px solid var(--line)",
              borderRadius: "16px",
              padding: "24px",
              margin: "32px 0",
              boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "var(--ink)" }}>🔍 IPO Lens Score Drivers Snapshot</h4>
                <span style={{ fontSize: "11px", background: "var(--blue-soft)", color: "var(--blue)", padding: "3px 8px", borderRadius: "4px", fontWeight: 700 }}>Weighted Model</span>
              </div>

              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px", fontWeight: 600 }}>
                    <span style={{ color: "var(--ink)" }}>1. Financial Consistency</span>
                    <span style={{ color: "var(--green)" }}>85/100</span>
                  </div>
                  <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px" }}>
                    <div style={{ height: "100%", width: "85%", background: "var(--green)", borderRadius: "3px" }}></div>
                  </div>
                </div>
                
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px", fontWeight: 600 }}>
                    <span style={{ color: "var(--ink)" }}>2. Subscription Demand</span>
                    <span style={{ color: "var(--green)" }}>90/100</span>
                  </div>
                  <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px" }}>
                    <div style={{ height: "100%", width: "90%", background: "var(--green)", borderRadius: "3px" }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px", fontWeight: 600 }}>
                    <span style={{ color: "var(--ink)" }}>3. Valuation Comfort</span>
                    <span style={{ color: "var(--amber)" }}>45/100</span>
                  </div>
                  <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px" }}>
                    <div style={{ height: "100%", width: "45%", background: "var(--amber)", borderRadius: "3px" }}></div>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px", fontWeight: 600 }}>
                    <span style={{ color: "var(--ink)" }}>4. Risk Mitigation</span>
                    <span style={{ color: "var(--red)" }}>35/100</span>
                  </div>
                  <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px" }}>
                    <div style={{ height: "100%", width: "35%", background: "var(--red)", borderRadius: "3px" }}></div>
                  </div>
                </div>
              </div>
            </div>

            <h2 id="score-model">So what does IPO Lens Score look at?</h2>
            <p>
              The IPO Lens Score is designed as a <strong>rule-based educational signal</strong>. It does not try to predict guaranteed listing
              gains. Instead, it tries to answer a more useful beginner question:
            </p>

            <div className="blog-callout">
              <p>
                <strong>“Is this IPO supported by enough data, demand, business quality and valuation comfort — or is the excitement mostly hype?”</strong>
              </p>
            </div>

            <div className="blog-investor-grid">
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}>📊</div>
                <h4>1. Subscription Demand</h4>
                <p>Checks retail, QIB, NII/HNI and total demand. Strong demand matters more when it is broad-based.</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>📈</div>
                <h4>2. GMP Momentum</h4>
                <p>Uses GMP as a sentiment input, but gives it limited weight because it is unofficial and volatile.</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "var(--green-soft)", color: "var(--green-dark)" }}>💼</div>
                <h4>3. Financial Strength</h4>
                <p>Looks at revenue growth, PAT trend, margins, debt, ROE/ROCE and consistency of performance.</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>🏷️</div>
                <h4>4. Valuation Comfort</h4>
                <p>Checks whether the IPO valuation looks reasonable compared with peers, growth and profitability.</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "var(--red-soft)", color: "var(--red)" }}>⚠️</div>
                <h4>5. Risk Factors</h4>
                <p>Reads key risks such as high debt, customer concentration, litigation, dependency, and SME concerns.</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>🎯</div>
                <h4>6. Objects of Issue</h4>
                <p>Checks whether IPO money is going toward growth, debt reduction, working capital, OFS, or corporate purposes.</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>🚨</div>
                <h4>7. SME Liquidity Risk</h4>
                <p>For SME IPOs, the score adds extra caution for low liquidity, small scale, and post-listing exit risk.</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "var(--blue-soft)", color: "var(--blue)" }}>ℹ️</div>
                <h4>8. Lead Manager & Quality</h4>
                <p>Looks at lead manager history, background risks, source confidence and missing data warnings.</p>
              </div>
            </div>

            <h2 id="gmp-vs-fundamentals">GMP vs subscription vs fundamentals</h2>
            <p>These three signals answer different questions. Treating them as the same can create wrong conclusions.</p>

            <div className="blog-fin-table-wrap">
              <table className="blog-fin-table">
                <thead>
                  <tr>
                    <th>Signal</th>
                    <th>What it tells you</th>
                    <th>What it does not tell you</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>GMP</strong></td>
                    <td>Unofficial market mood before listing.</td>
                    <td>Business quality, fair valuation, or guaranteed listing gains.</td>
                  </tr>
                  <tr>
                    <td><strong>Subscription</strong></td>
                    <td>Demand across investor categories during the IPO window.</td>
                    <td>Whether the business is good for long-term holding.</td>
                  </tr>
                  <tr>
                    <td><strong>Fundamentals</strong></td>
                    <td>Revenue, profit, margins, debt, cash flow and business strength.</td>
                    <td>Short-term listing excitement.</td>
                  </tr>
                  <tr>
                    <td><strong>Valuation</strong></td>
                    <td>Whether investors are paying a reasonable price for growth.</td>
                    <td>Whether allotment or listing gain will happen.</td>
                  </tr>
                  <tr>
                    <td><strong>Risks</strong></td>
                    <td>What can go wrong after you apply or after listing.</td>
                    <td>Market sentiment on listing day.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2>How to read the IPO Lens Score</h2>
            <p>The score is not a buy/sell/apply recommendation. It is a research shortcut that helps you understand the quality of available signals.</p>

            <div className="blog-fin-table-wrap">
              <table className="blog-fin-table">
                <thead>
                  <tr>
                    <th>Score Range</th>
                    <th>Label</th>
                    <th>Plain-English meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>80–100</strong></td>
                    <td>Strong Research Signal</td>
                    <td>Multiple indicators look supportive, but valuation and risks still need review.</td>
                  </tr>
                  <tr>
                    <td><strong>65–79</strong></td>
                    <td>Positive Research Signal</td>
                    <td>Data looks encouraging, but some factors may need caution.</td>
                  </tr>
                  <tr>
                    <td><strong>50–64</strong></td>
                    <td>Neutral / Mixed</td>
                    <td>Some signals are positive, but the case is not strong enough on its own.</td>
                  </tr>
                  <tr>
                    <td><strong>35–49</strong></td>
                    <td>Weak / Risky</td>
                    <td>Missing data, weak demand, high valuation or risk factors may dominate.</td>
                  </tr>
                  <tr>
                    <td><strong>Below 35</strong></td>
                    <td>High Caution</td>
                    <td>The IPO may need deeper review before a beginner considers it.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="blog-callout blog-callout-amber">
              <p>
                <strong>Important:</strong> A high score does not guarantee listing gain. A low score does not guarantee poor listing. IPO
                Lens is designed to support research, not replace your judgement.
              </p>
            </div>

            <h2>Example: Why a score can be positive even with SME caution</h2>
            <p>
              In the sample IPO Lens dashboard, the IPO score is shown as <strong>73/100</strong> with a positive research signal. The reasons
              include very high subscription demand, positive GMP premium, and consistent financial track record. But the same card also
              highlights <strong>SME IPO: higher liquidity risk</strong>.
            </p>

            <p>
              This is exactly how IPO Lens should work. It should not hide the risk just because demand looks strong. A normal investor needs
              both sides: why the IPO is attracting attention and what can go wrong.
            </p>

            <h2 id="sme-caution">Why SME IPOs need extra caution</h2>
            <p>
              SME IPOs can offer interesting growth opportunities, but they may also carry higher risk. Smaller companies may have limited
              operating history, lower liquidity after listing, wider spreads, more business concentration, and higher volatility.
            </p>

            <p>
              For SME IPOs, IPO Lens gives more importance to liquidity, issue size, lead manager quality, promoter/background risk, customer
              concentration, financial consistency and post-listing exit risk.
            </p>

            <h2>What IPO Lens will not do</h2>
            <p>
              To keep the platform responsible, IPO Lens should avoid language that sounds like guaranteed advice. The platform should not say
              “must apply,” “sure listing gain,” or “best IPO to buy.”
            </p>

            <p>Instead, the correct language is:</p>
            <ul className="bullet-list" style={{ paddingLeft: "20px", marginBottom: "20px" }}>
              <li style={{ marginBottom: "6px" }}>Strong research signal</li>
              <li style={{ marginBottom: "6px" }}>Positive demand signal</li>
              <li style={{ marginBottom: "6px" }}>Valuation needs review</li>
              <li style={{ marginBottom: "6px" }}>SME liquidity risk present</li>
              <li style={{ marginBottom: "6px" }}>Research before applying</li>
            </ul>

            <h2>Final takeaway</h2>
            <p>
              GMP is unofficial and not guaranteed. A serious IPO research page should help investors understand the full picture: what the
              company does, how the business is performing, how expensive the IPO is, whether demand is broad-based, what the risks are, and
              whether the data is verified.
            </p>

            <p>
              <strong>IPO Lens does not ignore GMP. It simply refuses to worship it.</strong>
            </p>

            <p>That is the difference between hype-driven IPO tracking and research-driven IPO intelligence.</p>

            {/* Custom styled Premium CTA callout */}
            <div className="blog-callout blog-callout-teal" style={{ marginTop: "40px", padding: "32px", borderRadius: "16px" }}>
              <h3 style={{ margin: "0 0 8px 0", color: "var(--ink)", fontSize: "20px", fontWeight: 800 }}>Research the next IPO beyond GMP</h3>
              <p style={{ margin: "0 0 20px 0", color: "var(--text)", fontSize: "15px", lineHeight: "1.6" }}>
                Open IPO Lens to check GMP, subscription, financials, valuation, risks and plain-English summaries in one research view.
              </p>
              <Link href="/" className="cta-small" style={{ display: "inline-block" }}>
                Explore Live IPOs →
              </Link>
            </div>

            <hr className="blog-divider" />

            <h2>Sources and further reading</h2>
            <ol className="source-list" style={{ paddingLeft: "20px", fontSize: "14px", lineHeight: "1.7", color: "var(--text)" }}>
              <li style={{ marginBottom: "8px" }}>
                <a href="https://www.sebi.gov.in/filings/public-issues.html" target="_blank" rel="noopener" style={{ color: "var(--blue)", fontWeight: 700, textDecoration: "none" }}>
                  SEBI Public Issues filings
                </a>{" "}
                — official DRHP/RHP/final offer document categories.
              </li>
              <li style={{ marginBottom: "8px" }}>
                <a href="https://investor.sebi.gov.in/advisory-investment-in-sme-segment.html" target="_blank" rel="noopener" style={{ color: "var(--blue)", fontWeight: 700, textDecoration: "none" }}>
                  SEBI investor advisory on SME segment companies
                </a>{" "}
                — cautions investors to conduct research, verify information and understand SME risks.
              </li>
              <li style={{ marginBottom: "8px" }}>
                <a href="https://groww.in/ipo/gmp" target="_blank" rel="noopener" style={{ color: "var(--blue)", fontWeight: 700, textDecoration: "none" }}>
                  Groww explainer on IPO GMP
                </a>{" "}
                — explains GMP as an unofficial and unregulated grey market premium and notes that it is not a guarantee.
              </li>
              <li style={{ marginBottom: "8px" }}>
                <a href="https://www.reuters.com/world/india/indias-hdb-financial-ipo-pricing-not-influenced-by-70-premium-grey-market-2025-06-20/" target="_blank" rel="noopener" style={{ color: "var(--blue)", fontWeight: 700, textDecoration: "none" }}>
                  Reuters on HDB Financial IPO pricing
                </a>{" "}
                — reports bankers saying IPO pricing was based on fundamentals, not grey market premium.
              </li>
            </ol>

            {/* FINAL DISCLAIMER */}
            <div className="blog-callout" style={{ marginTop: "48px" }}>
              <p>
                <strong>Disclaimer:</strong> This article is for educational and informational purposes only. IPO Lens does not provide
                investment advice, IPO recommendations, buy/sell/hold calls, or guaranteed return opinions. IPO investments are subject to
                market risks. GMP is unofficial and not guaranteed. Please read the DRHP/RHP and consult a qualified financial advisor
                before making investment decisions.
              </p>
            </div>
          </article>

          <aside className="blog-sidebar">
            <div className="blog-side-card blog-score-card-demo">
              <h4>IPO Lens Score</h4>
              <div className="blog-score-big">73<span>/100</span></div>
              <div className="blog-signal">Positive Research Signal</div>
              <div className="blog-progress"><span></span></div>
              <ul className="blog-check-list">
                <li><span className="blog-tick">✓</span> Very high subscription demand</li>
                <li><span className="blog-tick">✓</span> Positive GMP premium</li>
                <li><span className="blog-warn">⚠</span> SME IPO liquidity risk</li>
                <li><span className="blog-tick">✓</span> Financial track record visible</li>
              </ul>
            </div>
            
            <div className="blog-side-card">
              <h4>In this article</h4>
              <a href="#gmp-basics">What is GMP?</a>
              <a href="#why-gmp-misleads">Why GMP can mislead</a>
              <a href="#score-model">What the score checks</a>
              <a href="#gmp-vs-fundamentals">GMP vs Fundamentals</a>
              <a href="#sme-caution">SME IPO Caution</a>
            </div>

            <div className="blog-side-card">
              <h4>Beginner Rule</h4>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--muted)", lineHeight: 1.65 }}>
                Use GMP as a mood signal. Use financials, valuation and risks as research signals.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
