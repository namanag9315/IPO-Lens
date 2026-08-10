import { Activity, AlertTriangle, BarChart3, Search, Signal, TrendingUp } from "lucide-react";
import IPOCard from "@/components/ipo/IPOCard";
import FeaturedIPOCard from "@/components/ipo/FeaturedIPOCard";
import MarketSummaryCard from "@/components/ipo/MarketSummaryCard";
import TodayIPOCalendar from "@/components/ipo/TodayIPOCalendar";
import WatchlistPanel from "@/components/ipo/WatchlistPanel";
import { ButtonLink } from "@/components/ui/Button";
import { isSMECategory } from "@/lib/ipoCategory";
import { getComputedIPOs } from "@/lib/ipoData";
import { calculateScore, estimateListingGainPct } from "@/lib/scoring";
import type { ComputedIPO } from "@/types/ipo";

interface DashboardPageProps {
  searchParams?: {
    filter?: string;
    q?: string;
    sort?: string;
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DashboardFilter = "all" | "open" | "upcoming" | "sme" | "strong" | "watchlist";
type DashboardSort = "score" | "gmp" | "close";

const filters: { label: string; value: DashboardFilter }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Upcoming", value: "upcoming" },
  { label: "SME", value: "sme" },
  { label: "Strong", value: "strong" },
  { label: "Watchlist", value: "watchlist" },
];

function filterValue(value: string | undefined): DashboardFilter {
  if (value === "open" || value === "upcoming" || value === "sme" || value === "strong" || value === "watchlist") {
    return value;
  }

  return "all";
}

function sortValue(value: string | undefined): DashboardSort {
  if (value === "gmp" || value === "close") {
    return value;
  }

  return "score";
}

function calculatedScore(ipo: ComputedIPO) {
  if (ipo.ai_analysis?.score !== null && ipo.ai_analysis?.score !== undefined && ipo.ai_analysis.label) {
    return {
      label: ipo.ai_analysis.label,
      score: ipo.ai_analysis.score,
    };
  }

  return calculateScore({
    anchorInvestors: ipo.anchor_investors,
    anchorSummary: ipo.anchor_summary,
    category: ipo.category,
    financials: ipo.financials_yearly,
    gmp: ipo.latest_gmp ?? 0,
    issuePrice: ipo.latest_public_gmp_snapshot?.issue_price ?? ipo.price_band_high ?? 0,
    issueSizeCr: ipo.issue_size_cr ?? 0,
    niiX: ipo.latest_subscription?.nii_x ?? 0,
    objectsOfIssue: ipo.objects_of_issue,
    peers: ipo.peer_comparisons,
    qibX: ipo.latest_subscription?.qib_x ?? 0,
    retailX: ipo.latest_subscription?.retail_x ?? 0,
    totalX: ipo.latest_subscription?.total_x ?? 0,
  });
}

function gmpPct(ipo: ComputedIPO) {
  return ipo.latest_gmp_percent ?? estimateListingGainPct(ipo.latest_gmp, ipo.latest_public_gmp_snapshot?.issue_price ?? ipo.price_band_high);
}

function filteredIPOs(ipos: ComputedIPO[], filter: DashboardFilter, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  let rows = ipos;

  if (filter === "open" || filter === "upcoming") {
    rows = rows.filter((ipo) => ipo.status === filter);
  }

  if (filter === "sme") {
    rows = rows.filter((ipo) => isSMECategory(ipo.category));
  }

  if (filter === "strong") {
    rows = rows.filter((ipo) => calculatedScore(ipo).score >= 71);
  }

  if (filter === "watchlist") {
    rows = rows.filter((ipo) => calculatedScore(ipo).score >= 60 || ipo.status === "open");
  }

  if (!normalizedQuery) {
    return rows;
  }

  return rows.filter((ipo) => {
    const haystack = `${ipo.name} ${ipo.category ?? ""} ${ipo.status} ${ipo.company_profile?.sector ?? ""}`.toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function sortedIPOs(ipos: ComputedIPO[], sort: DashboardSort) {
  return ipos.slice().sort((a, b) => {
    if (sort === "gmp") {
      return (gmpPct(b) ?? Number.NEGATIVE_INFINITY) - (gmpPct(a) ?? Number.NEGATIVE_INFINITY);
    }

    if (sort === "close") {
      return (a.close_date ?? "9999-12-31").localeCompare(b.close_date ?? "9999-12-31");
    }

    return calculatedScore(b).score - calculatedScore(a).score;
  });
}

function averageGMP(ipos: ComputedIPO[]) {
  const values = ipos
    .map(gmpPct)
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function strongestIPO(ipos: ComputedIPO[]) {
  return sortedIPOs(ipos, "score")[0] ?? null;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const filter = filterValue(searchParams?.filter);
  const sort = sortValue(searchParams?.sort);
  const query = searchParams?.q ?? "";
  const allIPOs = await getComputedIPOs();
  const visibleIPOs = sortedIPOs(filteredIPOs(allIPOs, filter, query), sort);
  const featured = strongestIPO(allIPOs);
  const featuredScore = featured ? calculatedScore(featured) : { label: "Neutral signal", score: 0 };
  const openCount = allIPOs.filter((ipo) => ipo.status === "open").length;
  const strongCount = allIPOs.filter((ipo) => calculatedScore(ipo).score >= 71).length;
  const dataAlerts = allIPOs.filter((ipo) => ipo.latest_gmp === null || !ipo.latest_subscription).length;
  const avgGMP = averageGMP(allIPOs);
  const sparkline = allIPOs
    .map(gmpPct)
    .filter((value): value is number => value !== null)
    .map((value) => Math.max(0, value));

  return (
    <main className="dashboard-page">
      <section className="premium-hero">
        <div className="shell premium-hero-grid">
          <div className="premium-hero-copy">
            <div className="premium-pill">
              <span />
              Indian IPO dashboard • public data • rule-based signals
            </div>
            <h1>India IPO research, distilled for sharper decisions.</h1>
            <p>
              IPO Lens brings GMP, subscription demand, issue size and plain-English research signals into one disciplined view for Indian retail investors.
            </p>
            <div className="premium-hero-actions">
              <ButtonLink href="#ipos" variant="primary">
                View live IPOs →
              </ButtonLink>
              <ButtonLink href={featured ? `/ipo/${featured.slug}` : "/calendar"} variant="secondary">
                {featured ? "Open latest analysis" : "View calendar"}
              </ButtonLink>
            </div>
          </div>

          <FeaturedIPOCard ipo={featured} label={featuredScore.label} score={featuredScore.score} />
        </div>
      </section>

      <TodayIPOCalendar ipos={allIPOs} />

      <section className="section market-summary-section">
        <div className="shell market-summary-grid">
          <MarketSummaryCard accent="navy" explanation="Mainboard + SME" icon={<Activity size={22} />} label="Open IPOs" value={openCount.toString()} />
          <MarketSummaryCard
            accent={avgGMP === null ? "navy" : avgGMP > 0 ? "green" : avgGMP < 0 ? "red" : "navy"}
            explanation={avgGMP === null ? "Awaiting public snapshots" : "Unofficial premium"}
            icon={<TrendingUp size={22} />}
            label="Average GMP"
            sparkline={sparkline.length > 0 ? sparkline : undefined}
            value={avgGMP === null ? "NA" : `${avgGMP > 0 ? "+" : ""}${avgGMP.toFixed(1)}%`}
          />
          <MarketSummaryCard accent="navy" explanation="Score above 70" icon={<Signal size={22} />} label="Strong Signals" value={strongCount.toString()} />
          <MarketSummaryCard
            accent={dataAlerts > 0 ? "amber" : "navy"}
            explanation="Stale or incomplete data"
            icon={<AlertTriangle size={22} />}
            label="Data Alerts"
            value={dataAlerts.toString()}
          />
        </div>
      </section>

      <section className="section" id="ipos">
        <div className="shell signals-layout">
          <div>
            <div className="section-head compact">
              <div>
                <h2>Live IPO Signals</h2>
                <p>Real-time screening of open and upcoming IPOs. Click a card to view full research.</p>
              </div>
            </div>

            <div className="signals-controls">
              <form action="/#ipos" className="signals-search">
                <Search size={16} />
                <input defaultValue={query} name="q" placeholder="Search by IPO name, sector, exchange or keyword..." />
                <input name="filter" type="hidden" value={filter} />
                <input name="sort" type="hidden" value={sort} />
              </form>

              <div className="signals-filter-row">
                <div className="filter-group">
                  {filters.map((item) => (
                    <a
                      className={`filter ${filter === item.value ? "active" : ""}`}
                      href={`/?filter=${item.value}${query ? `&q=${encodeURIComponent(query)}` : ""}&sort=${sort}#ipos`}
                      key={item.value}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
                <form action="/#ipos">
                  <input name="filter" type="hidden" value={filter} />
                  <input name="q" type="hidden" value={query} />
                  <select className="sort-select" defaultValue={sort} name="sort">
                    <option value="score">Sort: Signal Score</option>
                    <option value="gmp">Sort: GMP %</option>
                    <option value="close">Sort: Close Date</option>
                  </select>
                </form>
              </div>
            </div>

            {visibleIPOs.length > 0 ? (
              <>
                <div className="ipo-grid premium-ipo-grid">
                  {visibleIPOs.slice(0, 8).map((ipo, index) => (
                    <IPOCard index={index} ipo={ipo} key={ipo.id} />
                  ))}
                </div>
                {visibleIPOs.length > 8 ? (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
                    <ButtonLink href="/#ipos" variant="secondary">
                      View more IPO signals →
                    </ButtonLink>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-card">No IPOs found for this filter.</div>
            )}
          </div>

          <WatchlistPanel ipos={allIPOs} />
        </div>
      </section>

      <section className="section methodology-section" id="methodology">
        <div className="shell methodology-card" id="analysis-engine">
          <div>
            <h2>Score Methodology</h2>
            <p>
              IPO Lens combines fundamentals, subscription demand, valuation comfort, GMP momentum, anchor quality, risk and objects of the issue.
              GMP is unofficial market sentiment, not a guaranteed listing outcome.
            </p>
          </div>
          <div className="methodology-metrics">
            <span><BarChart3 size={16} /> Rule-based score</span>
            <span><AlertTriangle size={16} /> Educational research only</span>
          </div>
        </div>
      </section>
    </main>
  );
}
