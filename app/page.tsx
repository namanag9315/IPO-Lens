import { Activity, AlertTriangle, BarChart3, Search, Signal, TrendingUp, ShieldCheck, Sparkles, GraduationCap } from "lucide-react";
import IPOCard from "@/components/ipo/IPOCard";
import FeaturedIPOCard from "@/components/ipo/FeaturedIPOCard";
import MarketSummaryCard from "@/components/ipo/MarketSummaryCard";
import TodayIPOCalendar from "@/components/ipo/TodayIPOCalendar";
import WatchlistPanel from "@/components/ipo/WatchlistPanel";
import HeroWatermark from "@/components/ui/HeroWatermark";
import { ButtonLink } from "@/components/ui/Button";
import { getComputedIPOs } from "@/lib/ipoData";
import { calculateScore, estimateListingGainPct } from "@/lib/scoring";
import { cleanAndFilterFinancials } from "@/lib/mappers/researchMapper";
import type { ComputedIPO } from "@/types/ipo";
export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams?: {
    filter?: string;
    q?: string;
    sort?: string;
  };
}

type DashboardFilter = "all" | "open" | "upcoming" | "closed" | "sme" | "strong" | "watchlist";
type DashboardSort = "score" | "gmp" | "close";

const filters: { label: string; value: DashboardFilter }[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Closed", value: "closed" },
  { label: "SME", value: "sme" },
  { label: "Strong", value: "strong" },
  { label: "Watchlist", value: "watchlist" },
];

function filterValue(value: string | undefined): DashboardFilter {
  if (
    value === "open" ||
    value === "upcoming" ||
    value === "closed" ||
    value === "sme" ||
    value === "strong" ||
    value === "watchlist"
  ) {
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
  return calculateScore({
    anchorInvestors: ipo.anchor_investors,
    anchorSummary: ipo.anchor_summary,
    category: ipo.category,
    financials: cleanAndFilterFinancials(ipo.financials_yearly ?? []),
    gmp: ipo.latest_gmp ?? 0,
    issuePrice: ipo.price_band_high ?? 0,
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
  return estimateListingGainPct(ipo.latest_gmp ?? 0, ipo.price_band_high) ?? 0;
}

function filteredIPOs(ipos: ComputedIPO[], filter: DashboardFilter, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  let rows = ipos;

  if (filter === "open" || filter === "upcoming") {
    rows = rows.filter((ipo) => ipo.status === filter);
  }

  if (filter === "closed") {
    rows = rows.filter((ipo) => ipo.status === "closed" || ipo.status === "listed");
  }

  if (filter === "sme") {
    rows = rows.filter((ipo) => ipo.category === "sme");
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
    // Open first
    if (a.status === "open" && b.status !== "open") {
      return -1;
    }
    if (b.status === "open" && a.status !== "open") {
      return 1;
    }

    // Upcoming second
    if (a.status === "upcoming" && (b.status === "closed" || b.status === "listed")) {
      return -1;
    }
    if (b.status === "upcoming" && (a.status === "closed" || a.status === "listed")) {
      return 1;
    }

    // Chosen sort criterion tie-breaker
    if (sort === "gmp") {
      return gmpPct(b) - gmpPct(a);
    }

    if (sort === "close") {
      return (a.close_date ?? "9999-12-31").localeCompare(b.close_date ?? "9999-12-31");
    }

    return calculatedScore(b).score - calculatedScore(a).score;
  });
}

function averageGMP(ipos: ComputedIPO[]) {
  const values = ipos.filter((ipo) => ipo.latest_gmp !== null && ipo.price_band_high).map(gmpPct);

  if (values.length === 0) {
    return 0;
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
  const sparkline = allIPOs.map((ipo) => Math.max(0, gmpPct(ipo)));

  return (
    <main className="dashboard-page">
      <section className="premium-hero">
        {/* Animated watermark in background */}
        <HeroWatermark />

        <div className="shell premium-hero-grid">
          <div className="premium-hero-copy">
            <div className="premium-pill">
              <span />
              Indian IPO dashboard • AI-powered analysis & rule-based signals
            </div>
            <h1>Smarter IPO research for retail investors.</h1>
            <p>
              Understand GMP, subscription demand, financials, risks and AI summaries before you apply.
            </p>

            {/* Custom Premium Feature Pills */}
            <div className="premium-feature-pills">
              <div className="feature-pill">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>Rule-based score</span>
              </div>
              <div className="feature-pill">
                <Sparkles size={16} className="text-purple-600" />
                <span>AI summaries</span>
              </div>
              <div className="feature-pill">
                <TrendingUp size={16} className="text-green-600" />
                <span>GMP tracking</span>
              </div>
              <div className="feature-pill">
                <GraduationCap size={16} className="text-amber-500" />
                <span>Educational only</span>
              </div>
            </div>

            <div className="premium-hero-actions">
              <ButtonLink href="#ipos" variant="primary">
                Explore Live IPOs →
              </ButtonLink>
              <ButtonLink href={featured ? `/ipo/${featured.slug}` : "/calendar"} variant="secondary">
                Open Sample Analysis
              </ButtonLink>
            </div>
          </div>

          <FeaturedIPOCard ipo={featured} label={featuredScore.label} score={featuredScore.score} />
        </div>
      </section>

      <TodayIPOCalendar ipos={allIPOs} />

      <section className="section market-summary-section">
        <div className="shell market-summary-grid">
          <MarketSummaryCard accent="blue" explanation="Mainboard + SME" icon={<Activity size={22} />} label="Open IPOs" value={openCount.toString()} />
          <MarketSummaryCard
            accent={avgGMP >= 0 ? "green" : "red"}
            explanation="Unofficial premium"
            icon={<TrendingUp size={22} />}
            label="Average GMP"
            sparkline={sparkline}
            value={`${avgGMP >= 0 ? "+" : ""}${avgGMP.toFixed(1)}%`}
          />
          <MarketSummaryCard accent="blue" explanation="Score above 70" icon={<Signal size={22} />} label="Strong Research Signals" value={strongCount.toString()} />
          <MarketSummaryCard
            accent={dataAlerts > 0 ? "amber" : "blue"}
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
                <h2>Live IPO Research</h2>
                <p>Real-time tracking of open and upcoming issues. Click a card to view full analysis.</p>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "6px", fontWeight: "600" }}>
                  Last updated: {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. IPO data changes frequently. Please verify final details from official sources before applying.
                </div>
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
