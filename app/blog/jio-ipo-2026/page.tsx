import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jio IPO 2026: India's Biggest-Ever Listing Explained | IPO Lens",
  description: "Jio Platforms filed its DRHP with SEBI on June 19, 2026. Everything you need to know — the OFS to fresh issue switch, valuation, financials, and what it means for investors.",
};

export default function JioIpoBlogPage() {
  return (
    <>
      {/* BREAKING BAR */}
      <div className="blog-breaking-bar">
        <span className="blog-breaking-label">🔴 Breaking</span>
        <span className="blog-breaking-text">
          Jio Platforms files DRHP with SEBI on June 19, 2026 — India&apos;s largest-ever IPO is officially in motion
        </span>
      </div>

      {/* HERO */}
      <section className="blog-hero">
        <div className="blog-hero-inner shell">
          <span className="blog-hero-eyebrow">📡 IPO Lens — Deep Dive</span>
          <h1>Jio IPO 2026: India&apos;s Biggest-Ever Listing, Explained</h1>
          <p className="blog-hero-sub">
            From the OFS controversy to a bold 100% fresh issue — everything you need to know before the subscription window opens.
          </p>
          <div className="blog-hero-meta">
            <span>📅 June 22, 2026</span>
            <span className="dot" />
            <span>⏱ 8 min read</span>
            <span className="dot" />
            <span>🏷 IPO Analysis · Reliance · Telecom</span>
          </div>
        </div>
      </section>

      {/* STAT BAR */}
      <div className="blog-stat-bar">
        <div className="blog-stat-bar-inner shell">
          <div className="blog-stat-item">
            <span className="blog-stat-num">₹37,700 Cr</span>
            <span className="blog-stat-label">Issue Size</span>
          </div>
          <div className="blog-stat-item">
            <span className="blog-stat-num">$137–180B</span>
            <span className="blog-stat-label">Valuation Range</span>
          </div>
          <div className="blog-stat-item">
            <span className="blog-stat-num">524M+</span>
            <span className="blog-stat-label">Subscribers</span>
          </div>
          <div className="blog-stat-item">
            <span className="blog-stat-num">100% FI</span>
            <span className="blog-stat-label">Fresh Issue Only</span>
          </div>
        </div>
      </div>

      {/* ARTICLE BODY */}
      <main className="blog-article-wrap">
        <div className="blog-article-content shell">
          
          {/* SECTION 1: What just happened */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">The Big Moment</p>
            <h2>It&apos;s finally official — Jio has filed for an IPO</h2>
            <p>
              After years of speculation, false starts, and enough anticipation to rival a major sporting event,{" "}
              <strong>Jio Platforms filed its Draft Red Herring Prospectus (DRHP) with SEBI on June 19, 2026</strong> — the
              same day Mukesh Ambani announced it at Reliance Industries&apos; 49th Annual General Meeting.
            </p>
            <p>
              This isn&apos;t rumour or roadmap anymore. The formal regulatory clock has started ticking. SEBI will now review
              the document (typically 30 to 75 days), and once observations are issued, Jio will set a price band, open the
              subscription window, and list on BSE and NSE.
            </p>

            <div className="blog-callout">
              <p>
                <strong>What is a DRHP?</strong> A Draft Red Herring Prospectus is the formal document a company files with
                SEBI before going public. It discloses financials, business details, use of proceeds, risks, and the IPO
                structure. It&apos;s the starting gun of the public listing process — not the finish line. The final price band
                comes later.
              </p>
            </div>

            <p>
              At an expected issue size of around ₹37,700 crore (roughly $4.5 billion), this would be{" "}
              <strong>the largest IPO in Indian stock market history</strong> — surpassing LIC&apos;s 2022 debut by a significant
              margin. The implied valuation of $133–180 billion would place Jio among the top two or three listed companies
              in India the moment it hits the exchanges.
            </p>
          </section>

          {/* VISUAL: Jio Scale */}
          <div className="blog-img-block">
            <div className="blog-img-placeholder blog-img-placeholder-jio">
              <div className="blog-img-icon">📡</div>
              <h3>Jio&apos;s Digital Empire — At a Glance</h3>
              <p>India&apos;s #1 telecom player · 524M subscribers · JioCinema · JioAirFiber · 5G SA Network · AI Infrastructure</p>
            </div>
            <p className="blog-img-caption">
              Jio Platforms houses Jio&apos;s telecom network, broadband, media, and AI stack under one corporate umbrella.
            </p>
          </div>

          <hr className="blog-divider" />

          {/* SECTION 2: What is Jio Platforms */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">The Company</p>
            <h2>What exactly is Jio Platforms?</h2>
            <p>
              Jio Platforms is not just a telecom company. It is Reliance Industries&apos; digital arm — a full-stack technology
              and connectivity business that was built to be listed separately from RIL&apos;s oil refining and retail operations.
            </p>
            <p>
              When it lists, investors won&apos;t get exposure to RIL&apos;s petrochemicals or Reliance Retail. They&apos;ll get a{" "}
              <strong>pure-play bet on India&apos;s digital economy</strong>: mobile connectivity, home broadband,
              entertainment, cloud services, and artificial intelligence.
            </p>

            <div className="blog-investor-grid">
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "#E6F1FB", color: "#0C447C" }}>📱</div>
                <h4>JioTrue5G</h4>
                <p>Standalone 5G network — India&apos;s most advanced</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "#E1F5EE", color: "#085041" }}>🏠</div>
                <h4>JioAirFiber</h4>
                <p>Fixed wireless broadband — growing fast</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "#FAEEDA", color: "#854F0B" }}>🎬</div>
                <h4>JioStar</h4>
                <p>34.7% TV viewership share in India</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "#EEEDFE", color: "#3C3489" }}>🤖</div>
                <h4>Jio AI</h4>
                <p>AI data centres, cloud, enterprise solutions</p>
              </div>
            </div>

            <p>
              The company crossed <strong>500 million subscribers</strong> in 2025 — a number larger than the entire population
              of the United States. It operates through what it calls a &quot;phygital&quot; model, combining physical distribution
              with digital delivery to serve customers across India&apos;s metros and rural heartland alike.
            </p>
            <p>
              In FY26, Jio Platforms reported revenue of ₹1,46,885 crore (up 14.6% YoY) and a net profit of ₹30,049 crore (up
              15.1% YoY) — strong, consistent growth that investors will scrutinise carefully when setting valuations.
            </p>
          </section>

          <hr className="blog-divider" />

          {/* SECTION 3: OFS vs Fresh Issue */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">The Big Structural Twist</p>
            <h2>Why the switch from OFS to a fresh issue matters — a lot</h2>
            <p>This is the single most important structural detail in the Jio IPO, and it deserves a clear explanation.</p>

            {/* Visual comparison */}
            <div className="blog-compare-grid">
              <div className="blog-compare-card">
                <span className="blog-compare-badge blog-badge-red">❌ Earlier Plan — OFS</span>
                <h3>Offer for Sale (OFS)</h3>
                <ul className="bullet-list">
                  <li><span className="blog-cross">✕</span> Existing shareholders sell their stakes</li>
                  <li><span className="blog-cross">✕</span> Money goes to investors (Meta, Google, KKR, PIF…), not to Jio</li>
                  <li><span className="blog-cross">✕</span> Company receives zero capital from the IPO</li>
                  <li><span className="blog-cross">✕</span> Signals that insiders want to cash out</li>
                  <li><span className="blog-cross">✕</span> Valuation disagreement between Reliance and global investors caused conflict</li>
                </ul>
              </div>
              <div className="blog-compare-card featured">
                <span className="blog-compare-badge blog-badge-blue">✅ Final Structure — 100% Fresh Issue</span>
                <h3>Fresh Issue</h3>
                <ul className="bullet-list">
                  <li><span className="blog-check">✓</span> New shares are created and sold to the public</li>
                  <li><span className="blog-check">✓</span> Every rupee goes directly into Jio Platforms</li>
                  <li><span className="blog-check">✓</span> Proceeds earmarked for debt repayment and AI/infra</li>
                  <li><span className="blog-check">✓</span> Global investors (Meta, Google, KKR, PIF) are NOT selling</li>
                  <li><span className="blog-check">✓</span> Signals confidence — no rush to exit</li>
                </ul>
              </div>
            </div>

            <div className="blog-callout blog-callout-amber">
              <p>
                <strong>What caused the switch?</strong> Reports from May 2026 indicate Reliance and its global shareholders
                (Meta, Google, KKR, and sovereign funds PIF, ADIA, Mubadala) disagreed on the valuation at which existing
                investors would sell their stakes. Rather than delay the listing further over pricing disputes, Reliance
                dropped the OFS component entirely and pivoted to a 100% fresh issue — a clean, investor-friendly move.
              </p>
            </div>

            <p>
              For retail investors, this is genuinely good news. When a company raises capital entirely as a fresh issue, it
              means the business itself is the beneficiary. Compare this to many high-profile IPOs in recent years where
              large OFS components meant the money raised went straight out the door to private equity firms and early investors
              — leaving the company no richer after listing.
            </p>
          </section>

          {/* VISUAL: OFS vs Fresh Issue diagram placeholder */}
          <div className="blog-img-block">
            <div className="blog-img-placeholder blog-img-placeholder-ofs">
              <div className="blog-img-icon">🔄</div>
              <h3>OFS vs Fresh Issue — Where Does the Money Flow?</h3>
              <p>OFS: Public → Existing Shareholders · Fresh Issue: Public → Company → Growth</p>
            </div>
            <p className="blog-img-caption">
              In a 100% fresh issue, every rupee raised flows into the company&apos;s balance sheet — not to exiting investors.
            </p>
          </div>

          <hr className="blog-divider" />

          {/* SECTION 4: IPO Journey Timeline */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">How We Got Here</p>
            <h2>The Jio IPO journey — a timeline</h2>

            <div className="blog-timeline">
              <div className="blog-tl-item">
                <div className="blog-tl-dot"></div>
                <div className="blog-tl-content">
                  <p className="blog-tl-date">2020–21</p>
                  <h4>The great fundraise</h4>
                  <p>
                    Jio Platforms raises ₹1.52 lakh crore ($20 billion) by selling a 32.97% stake to Meta, Google, Silver
                    Lake, KKR, Vista Equity, Saudi PIF, ADIA, and Mubadala. The IPO seeds are quietly planted.
                  </p>
                </div>
              </div>
              <div className="blog-tl-item">
                <div className="blog-tl-dot amber"></div>
                <div className="blog-tl-content">
                  <p className="blog-tl-date amber">August 2025</p>
                  <h4>Mukesh Ambani&apos;s AGM announcement</h4>
                  <p>
                    At Reliance&apos;s 48th AGM, Ambani formally announces that Jio will file for an IPO and aims to list by H1
                    2026. Jio Chairman Akash Ambani confirms the company has crossed 500 million subscribers.
                  </p>
                </div>
              </div>
              <div className="blog-tl-item">
                <div className="blog-tl-dot amber"></div>
                <div className="blog-tl-content">
                  <p className="blog-tl-date amber">March 2026</p>
                  <h4>The OFS plan is dropped</h4>
                  <p>
                    Reliance drops the OFS route after a valuation disagreement with global investors and commits to a 100%
                    fresh issue of ₹25,000 crore. Investment banks estimate Jio&apos;s post-IPO value at $133–180 billion.
                  </p>
                </div>
              </div>
              <div className="blog-tl-item">
                <div className="blog-tl-dot amber"></div>
                <div className="blog-tl-content">
                  <p className="blog-tl-date amber">May 2026</p>
                  <h4>IPO confirmed &quot;imminent&quot;</h4>
                  <p>
                    During Reliance&apos;s FY26 earnings call, management confirms the Jio IPO is &quot;imminent.&quot; The DRHP is
                    expected within one to two weeks. Geopolitical concerns briefly raise questions about timing.
                  </p>
                </div>
              </div>
              <div className="blog-tl-item">
                <div className="blog-tl-dot teal"></div>
                <div className="blog-tl-content">
                  <p className="blog-tl-date teal">June 19, 2026 — D-Day</p>
                  <h4>DRHP filed with SEBI</h4>
                  <p>
                    Jio Platforms&apos; board approves the DRHP in the morning. Mukesh Ambani announces the filing at
                    RIL&apos;s 49th AGM, calling it &quot;a deeply emotional moment.&quot; The DRHP is submitted to SEBI the same day.
                    India&apos;s biggest-ever IPO is officially in motion.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <hr className="blog-divider" />

          {/* SECTION 5: IPO Details */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">The Numbers</p>
            <h2>Key IPO details from the DRHP</h2>

            <div className="blog-fin-table-wrap">
              <table className="blog-fin-table">
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Issue type</td>
                    <td>100% Book-Built Fresh Issue — no OFS component</td>
                  </tr>
                  <tr>
                    <td>Shares offered</td>
                    <td>Up to 27 crore equity shares (face value ₹10 each)</td>
                  </tr>
                  <tr>
                    <td>Expected issue size</td>
                    <td>₹37,700 crore (~$4.5 billion)</td>
                  </tr>
                  <tr>
                    <td>Equity dilution</td>
                    <td>~2.5% of post-issue capital</td>
                  </tr>
                  <tr>
                    <td>Indicative valuation</td>
                    <td>$133–180 billion (₹11–15 lakh crore)</td>
                  </tr>
                  <tr>
                    <td>Indicative price range</td>
                    <td>~₹1,100–₹1,300 per share (not confirmed)</td>
                  </tr>
                  <tr>
                    <td>Listing exchanges</td>
                    <td>BSE and NSE</td>
                  </tr>
                  <tr>
                    <td>Registrar</td>
                    <td>KFin Technologies Limited</td>
                  </tr>
                  <tr>
                    <td>Book running lead managers</td>
                    <td>
                      19 BRLMs incl. Morgan Stanley, Goldman Sachs, J.P. Morgan, BofA, Axis Capital, SBI Capital, HDFC Bank
                    </td>
                  </tr>
                  <tr>
                    <td>Expected listing window</td>
                    <td>August–October 2026 (subject to SEBI review)</td>
                  </tr>
                  <tr>
                    <td>Special quota</td>
                    <td>Reserved category for existing Reliance Industries shareholders</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="blog-callout blog-callout-teal">
              <p>
                <strong>RIL Shareholder Quota:</strong> If you hold Reliance Industries (RIL) shares in your demat account
                on the official record date (to be announced), you will be eligible to apply under a reserved shareholder
                category — giving you statistically better allotment odds than the general retail queue. Watch for the record
                date announcement after SEBI clears the DRHP.
              </p>
            </div>
          </section>

          <hr className="blog-divider" />

          {/* SECTION 6: Use of Proceeds */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">Where the Money Goes</p>
            <h2>How will Jio use the IPO proceeds?</h2>
            <p>
              The DRHP is unusually specific about this, which is a positive sign for investors seeking clarity on capital
              deployment.
            </p>

            <div className="blog-proceeds-card">
              <div className="blog-proceeds-header">Allocation of ₹37,700 Crore IPO Proceeds</div>
              <div className="blog-proceeds-body">
                <div className="blog-proceeds-row">
                  <div>
                    <div className="blog-proceeds-label">🏦 Debt Repayment (Reliance Jio Infocomm)</div>
                    <div className="blog-proceeds-bar-wrap">
                      <div className="blog-proceeds-bar" style={{ width: "73%" }}></div>
                    </div>
                  </div>
                  <div className="blog-proceeds-amount">₹27,500 Cr</div>
                </div>
                <div className="blog-proceeds-row">
                  <div>
                    <div className="blog-proceeds-label">🤖 General Corporate Purposes (incl. AI &amp; infrastructure)</div>
                    <div className="blog-proceeds-bar-wrap">
                      <div className="blog-proceeds-bar" style={{ width: "27%", background: "var(--green)" }}></div>
                    </div>
                  </div>
                  <div className="blog-proceeds-amount">~₹10,200 Cr</div>
                </div>
              </div>
            </div>

            <p>
              Here&apos;s why the debt angle is significant: Jio&apos;s net debt stood at ₹27,579 crore as of March 2026 — already
              down sharply from ₹45,273 crore a year earlier and ₹48,440 crore in March 2024. If ₹27,500 crore of IPO proceeds
              goes toward repayment, Jio could emerge from the listing essentially <strong>debt-free</strong>. That would be
              a remarkable financial transformation for a company that spent hundreds of thousands of crores building India&apos;s
              4G and 5G infrastructure from scratch.
            </p>
            <p>
              The remaining ~₹10,000 crore is earmarked for AI infrastructure, data centres, cloud expansion, and network
              upgrades — underscoring Jio&apos;s ambition to be India&apos;s dominant AI platform, not just a connectivity provider.
            </p>
          </section>

          {/* VISUAL: Financials */}
          <div className="blog-img-block">
            <div className="blog-img-placeholder blog-img-placeholder-fin">
              <div className="blog-img-icon">📊</div>
              <h3>Jio&apos;s Financial Growth Story</h3>
              <p>FY26 Revenue: ₹1,46,885 Cr (+14.6%) · Net Profit: ₹30,049 Cr (+15.1%) · Net Debt falling fast</p>
            </div>
            <p className="blog-img-caption">
              Jio has delivered consistent double-digit revenue and profit growth — a key pillar of its IPO story.
            </p>
          </div>

          <hr className="blog-divider" />

          {/* SECTION 7: Financials snapshot */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">Financials</p>
            <h2>A three-year financial snapshot</h2>

            <div className="blog-fin-table-wrap">
              <table className="blog-fin-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th style={{ textAlign: "right" }}>FY24</th>
                    <th style={{ textAlign: "right" }}>FY25</th>
                    <th style={{ textAlign: "right" }}>FY26</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Revenue from operations</td>
                    <td className="num">₹1,12,082 Cr</td>
                    <td className="num">₹1,28,218 Cr</td>
                    <td className="num">₹1,46,885 Cr</td>
                  </tr>
                  <tr>
                    <td>Revenue growth YoY</td>
                    <td className="pos">—</td>
                    <td className="pos">+14.4%</td>
                    <td className="pos">+14.6%</td>
                  </tr>
                  <tr>
                    <td>Net profit</td>
                    <td className="num">₹22,679 Cr</td>
                    <td className="num">₹26,110 Cr</td>
                    <td className="num">₹30,049 Cr</td>
                  </tr>
                  <tr>
                    <td>Net profit growth YoY</td>
                    <td className="pos">—</td>
                    <td className="pos">+15.1%</td>
                    <td className="pos">+15.1%</td>
                  </tr>
                  <tr>
                    <td>Net debt</td>
                    <td className="num">₹48,440 Cr</td>
                    <td className="num">₹45,273 Cr</td>
                    <td className="num">₹27,579 Cr</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              The consistent 14–15% annual growth in both revenue and profit is a strong signal. Elara Capital, ahead of the
              DRHP filing, projected 11% revenue CAGR and 14% EBITDA CAGR over FY26–FY29 — suggesting the market expects this
              trajectory to continue. The rapidly declining debt pile further strengthens the balance sheet story.
            </p>
          </section>

          <hr className="blog-divider" />

          {/* SECTION 8: Who owns Jio */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">Shareholding</p>
            <h2>Who are the current owners of Jio Platforms?</h2>
            <p>
              Jio Platforms has an extraordinary shareholder register — the result of a $20 billion fundraising blitz during
              the pandemic years of 2020–21. Global tech giants and sovereign wealth funds rushed to buy into India&apos;s digital
              story.
            </p>

            <div className="blog-investor-grid">
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "#E6F1FB", color: "#0C447C" }}>🏢</div>
                <h4>Reliance Industries</h4>
                <p>Majority promoter holding</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "#E8F5E9", color: "#2E7D32" }}>📘</div>
                <h4>Meta (Facebook)</h4>
                <p>Strategic investor since 2020</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "#FAECE7", color: "#993C1D" }}>🔍</div>
                <h4>Google</h4>
                <p>Strategic investor since 2020</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "#FAEEDA", color: "#854F0B" }}>💰</div>
                <h4>KKR &amp; Vista Equity</h4>
                <p>Private equity investors</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "#EEEDFE", color: "#3C3489" }}>🌍</div>
                <h4>Saudi PIF</h4>
                <p>Saudi Arabia&apos;s sovereign fund</p>
              </div>
              <div className="blog-investor-card">
                <div className="blog-investor-icon" style={{ background: "#E1F5EE", color: "#085041" }}>🇦🇪</div>
                <h4>ADIA &amp; Mubadala</h4>
                <p>Abu Dhabi sovereign funds</p>
              </div>
            </div>

            <div className="blog-callout blog-callout-teal">
              <p>
                <strong>Are existing investors selling?</strong> No — not through this IPO. Because the structure is a 100%
                fresh issue, Meta, Google, KKR, PIF, ADIA, and Mubadala (who together hold ~32.9% of Jio) are not selling
                any shares in the offering. They may pursue secondary market transactions after listing, but that is entirely
                separate from the IPO process.
              </p>
            </div>
          </section>

          <hr className="blog-divider" />

          {/* SECTION 9: Why it's significant */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">Market Context</p>
            <h2>Why the Jio IPO is a watershed moment for Indian markets</h2>

            <p>
              India crossed the 1 billion internet user mark in November 2025 — a milestone that underscores just how central
              digital connectivity has become to daily life. Jio, launched in 2016, was the catalyst for much of this
              transformation. When India ranked 155th globally in mobile data consumption in 2016, few predicted it would
              reach the top within a year of Jio&apos;s launch, overtaking the USA and UK in broadband usage.
            </p>

            <p>The IPO carries significance well beyond its size:</p>

            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0" }}>
              <li style={{ padding: "12px 0", borderBottom: "1px solid var(--line)", fontSize: "15px", color: "var(--text)", display: "flex", gap: "12px" }}>
                <span style={{ color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>01</span>
                It will be India&apos;s largest IPO ever, dwarfing LIC&apos;s 2022 listing.
              </li>
              <li style={{ padding: "12px 0", borderBottom: "1px solid var(--line)", fontSize: "15px", color: "var(--text)", display: "flex", gap: "12px" }}>
                <span style={{ color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>02</span>
                Jio will rank among the top 2–3 most valuable listed companies in India from day one.
              </li>
              <li style={{ padding: "12px 0", borderBottom: "1px solid var(--line)", fontSize: "15px", color: "var(--text)", display: "flex", gap: "12px" }}>
                <span style={{ color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>03</span>
                Once it enters Nifty 50 and Sensex, it will trigger large index-inclusion flows, reshaping India&apos;s benchmark indices.
              </li>
              <li style={{ padding: "12px 0", borderBottom: "1px solid var(--line)", fontSize: "15px", color: "var(--text)", display: "flex", gap: "12px" }}>
                <span style={{ color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>04</span>
                It gives retail investors a direct stake in a company that serves over half a billion Indians.
              </li>
              <li style={{ padding: "12px 0", fontSize: "15px", color: "var(--text)", display: "flex", gap: "12px" }}>
                <span style={{ color: "var(--blue)", fontWeight: 700, flexShrink: 0 }}>05</span>
                It is one of the largest IPOs globally in 2026, reinforcing India&apos;s position as a premier destination for capital markets.
              </li>
            </ul>

            <p>
              Mukesh Ambani called the filing &quot;a deeply emotional moment,&quot; and announced that the next generation — Akash,
              Isha, and Anant Ambani — will lead the IPO process and the company&apos;s next chapter. It marks a generational
              transfer of stewardship for India&apos;s most influential digital enterprise.
            </p>
          </section>

          <hr className="blog-divider" />

          {/* SECTION 10: Risks */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">Balanced View</p>
            <h2>Risks investors should know about</h2>
            <p>No IPO analysis is complete without an honest assessment of risks. The DRHP is transparent about several:</p>

            <div className="blog-risk-grid">
              <div className="blog-risk-card">
                <h4>
                  <span className="blog-risk-dot"></span> Valuation stretch
                </h4>
                <p>
                  At ₹8–13 lakh crore expected market cap, Jio&apos;s listing valuation is among the highest ever for an Indian
                  company. High valuations can limit near-term listing gains even for fundamentally strong businesses.
                </p>
              </div>
              <div className="blog-risk-card">
                <h4>
                  <span className="blog-risk-dot"></span> Regulatory risk
                </h4>
                <p>
                  Telecom is a heavily regulated sector in India. Spectrum licences, interconnect regulations, and data
                  privacy laws can shift, impacting margins and operations. Jio&apos;s unified licence is up for renewal in October
                  2033.
                </p>
              </div>
              <div className="blog-risk-card">
                <h4>
                  <span className="blog-risk-dot"></span> Competition from Airtel
                </h4>
                <p>
                  Bharti Airtel continues to compete aggressively on 5G and enterprise services. While Jio&apos;s Standalone 5G network
                  is more advanced, Airtel has a loyal premium subscriber base and strong execution.
                </p>
              </div>
              <div className="blog-risk-card">
                <h4>
                  <span className="blog-risk-dot"></span> Infrastructure concentration
                </h4>
                <p>
                  Jio depends on a limited group of passive infrastructure providers for telecom towers and fibre. Any
                  disruption to this network could affect operations and lead to subscriber churn.
                </p>
              </div>
              <div className="blog-risk-card">
                <h4>
                  <span className="blog-risk-dot"></span> Allotment lottery risk
                </h4>
                <p>
                  Given the brand and scale, the IPO is expected to attract extremely high retail participation. This makes
                  retail allotment highly competitive and essentially lottery-dependent. Applying through the RIL shareholder
                  quota improves your odds.
                </p>
              </div>
              <div className="blog-risk-card">
                <h4>
                  <span className="blog-risk-dot"></span> Legal and tax exposure
                </h4>
                <p>
                  The DRHP discloses outstanding criminal proceedings against Reliance Jio Infocomm, and total direct and
                  indirect tax claims of ₹49,726 crore against the group. These are disclosed risks, not hidden ones — but they
                  exist.
                </p>
              </div>
            </div>
          </section>

          <hr className="blog-divider" />

          {/* SECTION 11: What's next */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">The Road Ahead</p>
            <h2>What happens next — the expected timeline</h2>

            <div className="blog-steps-grid">
              <div className="blog-step-card">
                <div className="blog-step-num">01</div>
                <h4>SEBI Review</h4>
                <p>30–75 days from June 19 filing. SEBI issues observations and may raise queries.</p>
              </div>
              <div className="blog-step-card">
                <div className="blog-step-num">02</div>
                <h4>Price Band Set</h4>
                <p>After SEBI clearance, Jio announces the price band in consultation with lead managers.</p>
              </div>
              <div className="blog-step-card">
                <div className="blog-step-num">03</div>
                <h4>Subscription Window</h4>
                <p>Retail, QIB, and NII investors can apply through UPI/ASBA. Shareholder quota opens simultaneously.</p>
              </div>
              <div className="blog-step-card">
                <div className="blog-step-num">04</div>
                <h4>Allotment &amp; Listing</h4>
                <p>Expected listing on BSE and NSE in the August–October 2026 window, subject to market conditions.</p>
              </div>
            </div>

            <div className="blog-callout blog-callout-coral">
              <p>
                <strong>Important:</strong> No official subscription dates or price band have been announced. The expected
                August–October 2026 window is based on standard SEBI review timelines from the June 19 filing date. Follow
                IPO Lens for real-time updates as SEBI observations are issued.
              </p>
            </div>
          </section>

          <hr className="blog-divider" />

          {/* SECTION 12: FAQ */}
          <section className="blog-section">
            <p className="blog-section-eyebrow">Quick Answers</p>
            <h2>Frequently asked questions</h2>

            <div className="blog-faq-item">
              <div className="blog-faq-q">
                <span className="q-badge">Q1</span> Is the Jio IPO confirmed or still speculation?
              </div>
              <div className="blog-faq-a">
                It is confirmed. Jio Platforms filed its DRHP with SEBI on June 19, 2026 — the formal regulatory process has
                begun. This is no longer speculative.
              </div>
            </div>
            <div className="blog-faq-item">
              <div className="blog-faq-q">
                <span className="q-badge">Q2</span> Is it a fresh issue or an OFS?
              </div>
              <div className="blog-faq-a">
                100% fresh issue. There is no Offer for Sale component. All 27 crore shares are newly created, meaning every
                rupee raised flows into Jio Platforms&apos; business — not to exiting investors.
              </div>
            </div>
            <div className="blog-faq-item">
              <div className="blog-faq-q">
                <span className="q-badge">Q3</span> What is the expected price per share?
              </div>
              <div className="blog-faq-a">
                Not yet announced. Based on the ₹37,700 crore expected raise across 27 crore shares, a rough indicative range
                is ₹1,100–₹1,300 per share — but this is not a confirmed figure and should not be used for investment
                decisions.
              </div>
            </div>
            <div className="blog-faq-item">
              <div className="blog-faq-q">
                <span className="q-badge">Q4</span> When can I apply?
              </div>
              <div className="blog-faq-a">
                Once SEBI completes its review (typically 30–75 days), Jio will announce subscription dates. The expected window
                is August to October 2026. You can apply through your broker or bank using UPI/ASBA.
              </div>
            </div>
            <div className="blog-faq-item">
              <div className="blog-faq-q">
                <span className="q-badge">Q5</span> I hold RIL shares — do I get a special quota?
              </div>
              <div className="blog-faq-a">
                Yes. Existing Reliance Industries shareholders are eligible for a reserved allocation category. Hold RIL shares
                in your demat account on the official record date (to be announced) to qualify. This gives you better allotment
                odds compared to the general retail category.
              </div>
            </div>
            <div className="blog-faq-item">
              <div className="blog-faq-q">
                <span className="q-badge">Q6</span> Are Meta, Google, and other investors selling?
              </div>
              <div className="blog-faq-a">
                Not through this IPO. Because the structure is a 100% fresh issue, none of the existing global investors are
                selling shares in the offering. They may sell in secondary markets after listing, but that is separate from
                the IPO.
              </div>
            </div>
            <div className="blog-faq-item">
              <div className="blog-faq-q">
                <span className="q-badge">Q7</span> How will Jio use the money raised?
              </div>
              <div className="blog-faq-a">
                Up to ₹27,500 crore will go toward repaying/prepaying debt at Reliance Jio Infocomm. The balance (~₹10,000
                crore) is for general corporate purposes including AI infrastructure, cloud, and network expansion.
              </div>
            </div>
          </section>

          {/* FINAL CALLOUT */}
          <div className="blog-callout" style={{ marginTop: "48px" }}>
            <p>
              <strong>Disclaimer:</strong> This article is for informational and educational purposes only. It does not
              constitute investment advice. IPO details are based on the DRHP filed on June 19, 2026 and market reports
              available at the time of writing. The price band, subscription dates, and allotment details are yet to be
              officially announced. Please consult a SEBI-registered financial advisor before making investment decisions.
            </p>
          </div>

        </div>
      </main>
    </>
  );
}
