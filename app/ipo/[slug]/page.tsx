import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { generateResearchNarrative } from "@/lib/ai/generateResearchNarrative";
import { getIPODataClean } from "@/lib/ipo-engine-clean/getIPODataClean";
import type { IPOResearchView, ResearchSection, ResearchSectionStatus } from "@/lib/ipo-engine-clean/public/buildIPOResearchView";
import { shouldShowSection } from "@/lib/ipo-engine-clean/public/buildIPOResearchView";
import { ipoTypeLabel } from "@/lib/ipoCategory";

// Force dynamic rendering so Groq AI narrative and DB data are always fresh
export const dynamic = "force-dynamic";
export const revalidate = 0;


interface IPOPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: IPOPageProps): Promise<Metadata> {
  const data = await getIPODataClean(params.slug);
  if (!data) return { title: "IPO Not Found - IPO Lens" };

  const view = data.researchView as IPOResearchView;
  const hero = view.sections.hero.values;

  return {
    title: `${hero.name} IPO Research - IPO Lens`,
    description: `IPO Lens dashboard for ${hero.name}: score, valuation, financials, demand, risks, timeline, and source confidence.`,
  };
}

function fmtDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function fmtMoney(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtCr(value: number | null | undefined): string | null {
  const amount = fmtMoney(value);
  return amount ? `${amount} Cr` : null;
}

function fmtPct(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}%`;
}

function fmtX(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return `${value.toFixed(1)}x`;
}

function statusLabel(status: ResearchSectionStatus): string {
  if (status === "complete") return "Complete";
  if (status === "source_limited") return "Source-limited";
  if (status === "needs_review") return "Needs Review";
  return "Partial";
}

function statusTone(status: ResearchSectionStatus): string {
  if (status === "complete") return "complete";
  if (status === "needs_review") return "needs-review";
  if (status === "source_limited") return "source-limited";
  return "partial";
}

function scoreColorClass(color: IPOResearchView["score"]["scoreColor"]): string {
  if (color === "green") return "score-green";
  if (color === "red") return "score-red";
  if (color === "yellow") return "score-yellow";
  return "score-amber";
}

function sectionBadge(status: ResearchSectionStatus) {
  return <span className={`research-section-badge ${statusTone(status)}`}>{statusLabel(status)}</span>;
}

function SectionCard<TValues>({
  id,
  section,
  title,
  children,
  force = false,
}: {
  children: ReactNode;
  force?: boolean;
  id: string;
  section: ResearchSection<TValues>;
  title: string;
}) {
  if (!force && !shouldShowSection(section)) return null;

  return (
    <section className="research-section-card" id={id}>
      <div className="research-section-header">
        <h2 className="research-section-title">{title}</h2>
        {sectionBadge(section.status)}
      </div>
      <div className="research-section-body">{children}</div>
    </section>
  );
}

function MiniFact({ label, value }: { label: string; value: ReactNode | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="research-mini-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetricCard({
  label,
  note,
  tone,
  value,
}: {
  label: string;
  note: string | null;
  tone: "green" | "amber" | "red" | "neutral";
  value: string;
}) {
  return (
    <div className={`research-metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </div>
  );
}

function BarRow({
  label,
  max,
  tone = "green",
  value,
  valueLabel,
}: {
  label: string;
  max: number;
  tone?: "green" | "amber" | "red" | "blue" | "slate";
  value: number;
  valueLabel: string;
}) {
  const width = max > 0 ? Math.max(4, Math.min(100, value / max * 100)) : 0;
  return (
    <div className="research-bar-row">
      <span>{label}</span>
      <div className="research-bar-track">
        <i className={`tone-${tone}`} style={{ width: `${width}%` }} />
      </div>
      <strong>{valueLabel}</strong>
    </div>
  );
}

export default async function IPOResearchPage({ params }: IPOPageProps) {
  const data = await getIPODataClean(params.slug);
  if (!data) notFound();

  const view = data.researchView as IPOResearchView;
  const narrative = await generateResearchNarrative(view);
  const heroSection = view.sections.hero;
  const hero = heroSection.values;
  const scoreSection = view.sections.score;
  const score = scoreSection.values;
  const metrics = view.sections.metrics.values.cards;
  const quickSignals = view.sections.quickSignals.values.signals;
  const company = view.sections.company.values;
  const valuation = view.sections.valuation.values;
  const financials = view.sections.financials.values;
  const demand = view.sections.demand.values;
  const manager = view.sections.manager.values;
  const risks = view.sections.risks.values.risks;
  const detailed = view.sections.detailedAnalysis.values;
  const timeline = view.sections.timeline.values.rows;
  const audit = view.sections.rawAudit.values;
  const isSME = hero.category === "sme";
  const docsHref = hero.documentLinks.length > 0 ? "#source-documents" : "#audit";

  const heroFacts: Array<[string, ReactNode | null]> = [
    ["Sector", hero.sector],
    ["Price band", hero.priceBand],
    ["Issue size", fmtCr(hero.issueSizeCr)],
    ["Lot size", hero.lotSize ? `${hero.lotSize.toLocaleString("en-IN")} shares` : null],
    ["Minimum investment", fmtMoney(hero.minInvestment)],
    ["Promoter holding post-IPO", hero.promoterHoldingPost !== null ? fmtPct(hero.promoterHoldingPost) : null],
  ];

  const peerRows = valuation.peerRows.filter((peer) => peer.peRatio !== null);
  const maxPE = Math.max(1, ...valuation.comparisonBars.map((bar) => bar.value));
  const maxRevenue = Math.max(1, ...financials.trendBars.map((bar) => bar.revenueCr));
  const maxSubscription = Math.max(1, ...demand.subscriptionBars.map((bar) => bar.times));
  const visibleFinancialRows = financials.tableRows.filter((row) => row.revenueCr !== null && row.patCr !== null);
  const allotmentDots = Array.from({ length: 20 }, (_, index) => index);
  const activeDots = demand.allotmentChancePct === null ? 0 : Math.max(1, Math.round(demand.allotmentChancePct / 5));

  return (
    <main className="research-page">
      <section className="research-hero">
        <div className="research-hero-inner">
          <div className="research-hero-copy">
            <div className="research-hero-meta">
              <span className={`ipo-type-badge ${isSME ? "badge-sme" : "badge-mainboard"}`}>
                {ipoTypeLabel(hero.category)}
              </span>
              <span className={`ipo-status-badge status-${hero.status}`}>
                {hero.status.charAt(0).toUpperCase() + hero.status.slice(1)}
              </span>
              {hero.exchange && <span className="ipo-exchange-badge">{hero.exchange}</span>}
              {hero.closeDate && <span className="ipo-date-badge">Closes {fmtDate(hero.closeDate)}</span>}
              {hero.listingDate && <span className="ipo-date-badge">Lists {fmtDate(hero.listingDate)}</span>}
            </div>

            <h1 className="research-hero-title">{hero.name}</h1>
            {hero.description && <p className="research-hero-desc">{hero.description}</p>}

            <div className="research-hero-actions">
              <Link className="btn btn-primary" href={`/allotment?ipo=${hero.slug}`}>
                Check allotment
              </Link>
              <a className="btn btn-outline" href={docsHref}>
                View documents
              </a>
              <Link className="btn btn-outline" href="/#watchlist">
                Add to watchlist
              </Link>
            </div>
          </div>

          <div className="research-hero-facts">
            {heroFacts.map(([label, value]) => (
              <MiniFact key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      </section>

      <div className="research-dashboard">
        <section className={`research-score-grid ${metrics.length === 0 ? "score-only" : ""}`} id="score">
          <div className="research-score-card">
            <div>
              <span className="research-eyebrow">IPO Lens Score</span>
              <div className={`research-score-number ${scoreColorClass(score.scoreColor)}`}>
                {score.score}<small>/100</small>
              </div>
            </div>
            <div className="research-score-copy">
              <strong>{score.signalLabel}</strong>
              <span>Confidence: {score.confidence}</span>
              {score.potentialScore !== null && <span>Potential score: {score.potentialScore}/100</span>}
              {score.caveat && <p>{score.caveat}</p>}
            </div>
          </div>

          <div className="research-metric-grid">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.key}
                label={metric.label}
                note={metric.note}
                tone={metric.tone}
                value={metric.value}
              />
            ))}
          </div>
        </section>

        <SectionCard id="quick-signals" section={view.sections.quickSignals} title="Quick Signals">
          <div className="research-signal-grid">
            {quickSignals.map((signal) => (
              <article className={`research-signal-card tone-${signal.tone}`} key={signal.key}>
                <div>
                  <span className={`research-signal-dot tone-${signal.tone}`} />
                  <strong>{signal.title}</strong>
                </div>
                <p>{signal.explanation}</p>
                <b>{signal.metric}</b>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard id="company" section={view.sections.company} title="What does this company do?">
          {company.description && <p className="research-section-lead">{company.description}</p>}
          {company.productChips.length > 0 && (
            <div className="research-chip-row">
              {company.productChips.map((product) => (
                <span key={product}>{product}</span>
              ))}
            </div>
          )}
          <div className="research-fact-grid">
            <MiniFact label="Sector" value={company.sector} />
            <MiniFact label="Promoter holding pre-IPO" value={company.promoterHoldingPre !== null ? fmtPct(company.promoterHoldingPre) : null} />
            <MiniFact label="Promoter holding post-IPO" value={company.promoterHoldingPost !== null ? fmtPct(company.promoterHoldingPost) : null} />
            <MiniFact label="Employees" value={company.employeeCount} />
            <MiniFact label="Manufacturing facilities" value={company.manufacturingFacilities} />
          </div>
        </SectionCard>

        <SectionCard id="valuation" section={view.sections.valuation} title="Is the price fair?">
          <p className="research-section-lead">
            P/E compares price with earnings. Lower or higher values need to be read against similar listed companies.
          </p>
          <div className={`research-verdict ${valuation.conclusion.includes("below") ? "green" : valuation.conclusion.includes("above") ? "amber" : "neutral"}`}>
            {valuation.conclusion}
          </div>

          {valuation.comparisonBars.length > 0 && (
            <div className="research-comparison-bars">
              {valuation.comparisonBars.map((bar) => (
                <BarRow
                  key={bar.label}
                  label={bar.label}
                  max={maxPE}
                  tone={bar.tone}
                  value={bar.value}
                  valueLabel={`${bar.value.toFixed(1)}x`}
                />
              ))}
            </div>
          )}

          <div className="research-fact-grid compact">
            <MiniFact label="IPO P/E" value={valuation.ipoPE !== null ? `${valuation.ipoPE.toFixed(1)}x` : null} />
            <MiniFact label="Peer average P/E" value={valuation.peerAveragePE !== null ? `${valuation.peerAveragePE.toFixed(1)}x` : null} />
            <MiniFact label="Price-to-book" value={valuation.priceToBook !== null ? `${valuation.priceToBook.toFixed(2)}x` : null} />
            <MiniFact label="EPS post-IPO" value={valuation.eps !== null ? fmtMoney(valuation.eps) : null} />
            <MiniFact label="Market cap" value={fmtCr(valuation.marketCap)} />
          </div>

          {peerRows.length > 0 && (
            <div className="research-table-wrap">
              <table className="research-data-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>P/E</th>
                    {valuation.peerTableColumns.includes("cmp") && <th>CMP</th>}
                    {valuation.peerTableColumns.includes("roe") && <th>ROE</th>}
                  </tr>
                </thead>
                <tbody>
                  {peerRows.map((peer) => (
                    <tr key={peer.companyName}>
                      <td>{peer.companyName}</td>
                      <td>{peer.peRatio!.toFixed(1)}x</td>
                      {valuation.peerTableColumns.includes("cmp") && <td>{fmtMoney(peer.cmp)}</td>}
                      {valuation.peerTableColumns.includes("roe") && <td>{fmtPct(peer.roePct)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard id="financials" section={view.sections.financials} title="How is the business doing?">
          <p className="research-section-lead">
            Revenue means total sales. PAT means profit after tax. Margin shows profit as a percentage of sales.
          </p>

          <div className="research-fact-grid compact">
            <MiniFact label="Latest revenue" value={fmtCr(financials.latestRevenue)} />
            <MiniFact label="Latest PAT" value={fmtCr(financials.latestPAT)} />
            <MiniFact label="PAT margin" value={fmtPct(financials.latestPATMargin)} />
            <MiniFact label="ROE" value={fmtPct(financials.latestROE)} />
            <MiniFact label="ROCE" value={fmtPct(financials.latestROCE)} />
            <MiniFact label="Revenue growth" value={fmtPct(financials.revenueGrowth)} />
            <MiniFact label="PAT growth" value={fmtPct(financials.patGrowth)} />
          </div>

          {financials.trendBars.length > 0 && (
            <div className="research-trend-bars">
              {financials.trendBars.map((bar) => (
                <BarRow
                  key={bar.label}
                  label={bar.label}
                  max={maxRevenue}
                  tone="blue"
                  value={bar.revenueCr}
                  valueLabel={fmtCr(bar.revenueCr) ?? ""}
                />
              ))}
            </div>
          )}

          {visibleFinancialRows.length > 0 && (
            <div className="research-table-wrap">
              <table className="research-data-table">
                <thead>
                  <tr>
                    <th>Year/Period</th>
                    <th>Revenue</th>
                    <th>PAT</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFinancialRows.map((row) => (
                    <tr key={row.period}>
                      <td>{row.period}</td>
                      <td>{fmtCr(row.revenueCr)}</td>
                      <td>{fmtCr(row.patCr)}</td>
                      <td>{fmtPct(row.patMarginPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard id="market" section={view.sections.demand} title="What is the market saying?">
          <div className="research-two-col">
            {demand.gmp.gmpValue !== null && (
              <article className="research-subcard">
                <span className="research-eyebrow">GMP</span>
                <strong className="research-large-value">
                  {fmtMoney(demand.gmp.gmpValue)}
                  {demand.gmp.gmpPercent !== null && <small> / {fmtPct(demand.gmp.gmpPercent)}</small>}
                </strong>
                <div className="research-fact-stack">
                  <MiniFact label="Issue price" value={fmtMoney(demand.gmp.issuePrice)} />
                  <MiniFact label="Estimated listing price" value={fmtMoney(demand.gmp.listingEstimate)} />
                </div>
                <p className="research-muted-note">Unofficial grey market data. It can reverse quickly.</p>
              </article>
            )}

            {demand.subscriptionBars.length > 0 && (
              <article className="research-subcard">
                <span className="research-eyebrow">Subscription breakdown</span>
                <div className="research-subscription-bars">
                  {demand.subscriptionBars.map((bar) => (
                    <BarRow
                      key={bar.category}
                      label={bar.category}
                      max={maxSubscription}
                      tone={bar.category === "Total" ? "green" : "blue"}
                      value={bar.times}
                      valueLabel={fmtX(bar.times) ?? ""}
                    />
                  ))}
                </div>
              </article>
            )}
          </div>

          {demand.allotmentChancePct !== null && (
            <article className="research-allotment-card">
              <div>
                <span>Estimated retail allotment chance</span>
                <strong>{fmtPct(demand.allotmentChancePct)}</strong>
                <p>Based on retail subscription of {fmtX(demand.retailTimes)} and available retail shares.</p>
              </div>
              <div className="research-dot-row" aria-hidden="true">
                {allotmentDots.map((dot) => (
                  <i className={dot < activeDots ? "active" : ""} key={dot} />
                ))}
              </div>
            </article>
          )}

          {demand.cleanSubscriptionRows.length > 0 && (
            <div className="research-table-wrap">
              <table className="research-data-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    {demand.showOfferedColumn && <th>Offered shares</th>}
                    {demand.showAppliedColumn && <th>Applied shares</th>}
                    <th>Times</th>
                  </tr>
                </thead>
                <tbody>
                  {demand.cleanSubscriptionRows.map((row) => (
                    <tr key={row.category}>
                      <td>{row.category}</td>
                      {demand.showOfferedColumn && <td>{row.offered ?? ""}</td>}
                      {demand.showAppliedColumn && <td>{row.applied ?? ""}</td>}
                      <td>{row.times !== null ? fmtX(row.times) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {isSME && (
          <SectionCard id="lead-manager" section={view.sections.manager} title="Lead manager review">
            <div className="research-manager-grid">
              <MiniFact label="Lead manager" value={manager.leadManagerName} />
              <MiniFact label="Status" value={manager.historyState === "tracked history" ? "Tracked history" : "History pending"} />
              <MiniFact label="Tracked IPOs" value={manager.trackedIPOCount !== null ? manager.trackedIPOCount.toLocaleString("en-IN") : null} />
              <MiniFact label="Positive listing rate" value={fmtPct(manager.positiveListingRatePct)} />
              <MiniFact label="Above issue after 30 days" value={fmtPct(manager.aboveIssueAfter30DaysPct)} />
              <MiniFact label="Track record score" value={manager.leadManagerScore !== null ? `${manager.leadManagerScore.toFixed(0)}/100` : null} />
            </div>
            {manager.historyState === "history pending" && (
              <p className="research-partial-state">
                Lead manager identified. Historical SME IPO performance is still being imported.
              </p>
            )}
          </SectionCard>
        )}

        <SectionCard id="risks" section={view.sections.risks} title="Risks to know before forming a view">
          <div className="research-risk-grid">
            {risks.map((risk) => (
              <article className={`research-risk-card risk-${risk.severity.toLowerCase()}`} key={risk.title}>
                <span>{risk.severity}</span>
                <strong>{risk.title}</strong>
                <p>{risk.description}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <section className="research-section-card" id="analysis">
          <details className="research-details">
            <summary>
              <span>Detailed analysis</span>
              {sectionBadge(view.sections.detailedAnalysis.status)}
            </summary>
            <div className="research-details-body">
              <p className="research-section-lead">{narrative.simpleSummary}</p>
              <div className="research-score-mini-grid">
                {detailed.factorPoints.map((factor) => (
                  <MiniFact key={factor.label} label={factor.label} value={factor.points.toFixed(1)} />
                ))}
              </div>
              <div className="research-verdict neutral">
                Score is {detailed.signalLabel.toLowerCase()} because the rule-based model combines demand, GMP,
                financials, valuation, manager data, and risk adjustments.
              </div>
              {detailed.missingData.length > 0 && (
                <div className="research-pending-list">
                  <h3>Data pending</h3>
                  <ul>
                    {detailed.missingData.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="research-note-list">
                {detailed.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            </div>
          </details>
        </section>

        <SectionCard id="timeline" section={view.sections.timeline} title="IPO timeline and key details">
          <div className="research-key-table">
            {timeline.map((row) => (
              <MiniFact key={row.label} label={row.label} value={row.label.toLowerCase().includes("date") ? fmtDate(row.value) ?? row.value : row.value} />
            ))}
          </div>
          {hero.documentLinks.length > 0 && (
            <div className="research-documents" id="source-documents">
              {hero.documentLinks.map((link) => (
                <a href={link.url} key={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </SectionCard>

        <section className="research-section-card" id="audit">
          <details className="research-details">
            <summary>
              <span>Source confidence &amp; raw data</span>
              <em>{audit.dataPointCount} data points</em>
            </summary>
            <div className="research-details-body">
              <div className="research-table-wrap">
                <table className="research-data-table audit-table">
                  <thead>
                    <tr>
                      <th>Fact key</th>
                      <th>Displayed value</th>
                      <th>Source provider</th>
                      <th>Confidence</th>
                      <th>Used in section</th>
                      <th>Missing reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {audit.rows.map((row, index) => (
                      <tr key={`${row.fieldName}-${index}`}>
                        <td>{row.sourceFactKey ?? row.fieldName}</td>
                        <td>{row.displayValue}</td>
                        <td>{row.sourceProvider ?? "Unavailable"}</td>
                        <td>{row.confidence ?? "Source-limited"}</td>
                        <td>{row.usedInSection}</td>
                        <td>{row.missingReason ?? "Used"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>

        <footer className="research-disclaimer">
          IPO Lens is for educational research only. Scores are rule-based signals, GMP is unofficial, and allotment
          chance is an estimate. Read the offer documents before forming a view.
        </footer>
      </div>
    </main>
  );
}
