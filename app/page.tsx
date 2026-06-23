import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  PieChart,
  Search,
  ShieldAlert,
  ShieldCheck,
  Signal,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import IPOCard from "@/components/ipo/IPOCard";
import TodayIPOCalendar from "@/components/ipo/TodayIPOCalendar";
import HeroWatermark from "@/components/ui/HeroWatermark";
import { ButtonLink } from "@/components/ui/Button";
import CompanyLogo from "@/components/ui/CompanyLogo";
import { getComputedIPOs } from "@/lib/ipoData";
import { calculateScore, estimateListingGainPct } from "@/lib/scoring";
import { cleanAndFilterFinancials, extractDomain, guessCompanyDomain } from "@/lib/mappers/researchMapper";
import type { ComputedIPO } from "@/types/ipo";
export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams?: {
    filter?: string;
    q?: string;
    sort?: string;
  };
}

type DashboardFilter = "all" | "mainboard" | "sme" | "open" | "upcoming" | "listed";
type DashboardSort = "score" | "gmp" | "close";

const filters: { label: string; value: DashboardFilter }[] = [
  { label: "All", value: "all" },
  { label: "Mainboard", value: "mainboard" },
  { label: "SME", value: "sme" },
  { label: "Open Now", value: "open" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Listed", value: "listed" },
];

const thinkingSteps = [
  {
    icon: CalendarDays,
    title: "IPO Opens",
    copy: "We track issue dates, price band and initial signals.",
    tone: "green",
  },
  {
    icon: TrendingUp,
    title: "GMP Moves",
    copy: "Grey market premium gives early sentiment, not certainty.",
    tone: "blue",
  },
  {
    icon: UsersRound,
    title: "Demand Builds",
    copy: "Subscription data shows interest across investor categories.",
    tone: "purple",
  },
  {
    icon: FileText,
    title: "Fundamentals Checked",
    copy: "Financials, business model and peer context are reviewed.",
    tone: "cyan",
  },
  {
    icon: ShieldAlert,
    title: "Risks Flagged",
    copy: "Key risks and caution areas are surfaced in plain English.",
    tone: "amber",
  },
  {
    icon: Target,
    title: "Final Score",
    copy: "All factors combine into an educational IPO score.",
    tone: "emerald",
  },
];

const learnCards = [
  {
    icon: BookOpen,
    href: "/learn#gmp",
    title: "Why GMP is not enough",
    copy: "Understand the limits of grey market premium.",
    tone: "green",
  },
  {
    icon: PieChart,
    href: "/learn#analyze-ipo",
    title: "How IPO Score works",
    copy: "Learn the factors behind our rule-based score.",
    tone: "blue",
  },
  {
    icon: Activity,
    href: "/learn#sme-ipo",
    title: "Mainboard vs SME IPO",
    copy: "Key differences every investor should know.",
    tone: "purple",
  },
  {
    icon: BarChart3,
    href: "/learn#key-terms",
    title: "How to read subscription data",
    copy: "Retail, HNI, QIB and total demand in simple terms.",
    tone: "amber",
  },
];

function filterValue(value: string | undefined): DashboardFilter {
  if (
    value === "mainboard" ||
    value === "open" ||
    value === "upcoming" ||
    value === "sme" ||
    value === "listed"
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

  if (filter === "sme") {
    rows = rows.filter((ipo) => ipo.category === "sme");
  }

  if (filter === "mainboard") {
    rows = rows.filter((ipo) => ipo.category === "mainboard");
  }

  if (filter === "listed") {
    rows = rows.filter((ipo) => ipo.status === "listed" || ipo.status === "closed");
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

function scoreSignalLabel(score: number) {
  if (score >= 71) {
    return "Positive Outlook";
  }

  if (score >= 51) {
    return "Balanced Outlook";
  }

  return "Needs More Research";
}

function scoreToneClass(score: number) {
  if (score >= 71) {
    return "strong";
  }

  if (score >= 51) {
    return "moderate";
  }

  return "weak";
}

function priceBandLabel(ipo: ComputedIPO | null) {
  if (!ipo?.price_band_low || !ipo.price_band_high) {
    return "—";
  }

  return `₹${ipo.price_band_low} - ₹${ipo.price_band_high}`;
}

function lotSizeLabel(ipo: ComputedIPO | null) {
  if (!ipo?.lot_size) {
    return "—";
  }

  return `${ipo.lot_size.toLocaleString("en-IN")} Shares`;
}

function ipoSubtitle(ipo: ComputedIPO | null) {
  if (!ipo) {
    return "Indian IPO research";
  }

  const sector = ipo.company_profile?.sector ?? ipo.company_profile?.industry ?? "IPO research";
  const location = ipo.company_profile?.headquarters;

  return location ? `${sector} · ${location}` : sector;
}

function ipoDescription(ipo: ComputedIPO | null) {
  if (!ipo) {
    return "A clean IPO research view with score, GMP, subscription demand, risks and plain-English summaries.";
  }

  return (
    ipo.company_profile?.company_overview ||
    ipo.company_profile?.business_model ||
    "Research this IPO through GMP, demand, financials, valuation comfort and risk signals before making your own decision."
  );
}

function homeScorePoints(ipo: ComputedIPO | null, score: number) {
  const premium = ipo ? gmpPct(ipo) : 0;
  const totalDemand = ipo?.latest_subscription?.total_x ?? 0;

  return [
    totalDemand > 0 ? "Subscription demand is tracked across investor categories" : "Subscription data will update as bidding progresses",
    premium > 0 ? "GMP momentum is visible, but remains unofficial" : "GMP is currently muted or unavailable",
    score >= 60 ? "Financial and issue details support the current score" : "Available fundamentals need more careful review",
    ipo?.category === "sme" ? "SME IPO needs extra caution on liquidity and volatility" : "Risks and valuation comfort are reviewed together",
  ];
}

function HomeFeaturedIPO({ ipo, score }: { ipo: ComputedIPO | null; score: number }) {
  const premium = ipo ? gmpPct(ipo) : 0;
  const totalDemand = ipo?.latest_subscription?.total_x ?? 0;
  const domain = ipo ? extractDomain(ipo.company_profile?.website) || guessCompanyDomain(ipo.name) : null;
  const scoreTone = scoreToneClass(score);
  const points = homeScorePoints(ipo, score);

  return (
    <article className="home-featured-card">
      <div className="home-featured-company">
        <p className="home-section-kicker">Today&apos;s Featured IPO</p>
        <div className="home-featured-title-row">
          <div className="home-company-logo">
            {ipo ? <CompanyLogo domain={domain} name={ipo.name} /> : <span>IPO</span>}
          </div>
          <div>
            <h2>{ipo?.name ?? "Featured IPO"}</h2>
            <p>{ipoSubtitle(ipo)}</p>
          </div>
          <span className="home-category-pill">{ipo?.category === "sme" ? "SME" : "Mainboard"}</span>
        </div>
        <p className="home-featured-description">{ipoDescription(ipo)}</p>
        <div className="home-featured-status-row">
          <span className={`home-signal-pill ${scoreTone}`}>Good</span>
          <span className={`home-signal-pill ${scoreTone}`}>{scoreSignalLabel(score)}</span>
          {ipo ? (
            <Link href={`/ipo/${ipo.slug}`}>View Full Analysis <ArrowRight size={14} /></Link>
          ) : null}
        </div>
      </div>

      <div className={`home-featured-score ${scoreTone}`} aria-label={`IPO score ${score} out of 100`}>
        <div className="home-featured-score-ring" style={{ ["--score" as string]: `${Math.min(Math.max(score, 0), 100) * 3.6}deg` }}>
          <div>
            <strong>{score}</strong>
            <span>/100</span>
          </div>
        </div>
        <p>IPO Score</p>
      </div>

      <div className="home-featured-details">
        <div className="home-featured-metrics">
          <div>
            <span>GMP</span>
            <strong>{premium >= 0 ? "+" : ""}{premium.toFixed(1)}%</strong>
            <small>{ipo?.latest_gmp ? `₹${ipo.latest_gmp}` : "Unofficial"}</small>
          </div>
          <div>
            <span>Subscription</span>
            <strong>{totalDemand ? `${totalDemand.toFixed(totalDemand >= 10 ? 0 : 1)}x` : "—"}</strong>
            <small>Demand</small>
          </div>
          <div>
            <span>Price Band</span>
            <strong>{priceBandLabel(ipo)}</strong>
            <small>Per share</small>
          </div>
          <div>
            <span>Lot Size</span>
            <strong>{lotSizeLabel(ipo)}</strong>
            <small>Minimum lot</small>
          </div>
        </div>

        <div className="home-why-score">
          <h3>Why this score?</h3>
          <div>
            {points.map((point) => (
              <p key={point}><CheckCircle2 size={15} /> {point}</p>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
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
  const avgGMP = averageGMP(allIPOs);
  const featuredPremium = featured ? gmpPct(featured) : avgGMP;
  const featuredSubscription = featured?.latest_subscription?.total_x ?? 0;
  const featuredScoreTone = scoreToneClass(featuredScore.score);
  const featuredSignalLabel = scoreSignalLabel(featuredScore.score);
  const featuredRiskLabel = featured?.category === "sme" ? "SME Caution" : "Moderate";

  return (
    <main className="dashboard-page">
      <section className="premium-hero">
        {/* Animated watermark in background */}
        <HeroWatermark />
        <div className="premium-hero-ambient" aria-hidden="true">
          <span className="ambient-orb ambient-orb-blue" />
          <span className="ambient-orb ambient-orb-green" />
          <span className="ambient-beam ambient-beam-one" />
          <span className="ambient-beam ambient-beam-two" />
        </div>

        <div className="shell premium-hero-grid">
          <div className="premium-hero-copy">
            <div className="home-hero-pill-row">
              <div className="premium-pill">
                <span />
                INDIAN IPO INTELLIGENCE
              </div>
              <span className="home-hero-mini-pill">Rule-based Score</span>
              <span className="home-hero-mini-pill">Educational Only</span>
            </div>
            <h1>See the full IPO story <span>before you apply.</span></h1>
            <p>
              Track GMP, demand, fundamentals, valuation comfort, risks and AI summaries in one clean research view.
            </p>

            <div className="premium-hero-actions">
              <ButtonLink href="#ipos" variant="primary">
                Explore Live IPOs →
              </ButtonLink>
              <ButtonLink href="#methodology" variant="secondary">
                See How Score Works
              </ButtonLink>
            </div>

            {/* Custom Premium Feature Pills */}
            <div className="premium-feature-pills">
              <div className="feature-pill">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>Live Market Data</span>
              </div>
              <div className="feature-pill">
                <Signal size={16} className="text-blue-600" />
                <span>Rule-based Score</span>
              </div>
              <div className="feature-pill">
                <Sparkles size={16} className="text-purple-600" />
                <span>AI Summaries</span>
              </div>
              <div className="feature-pill">
                <GraduationCap size={16} className="text-amber-500" />
                <span>Retail Focused</span>
              </div>
            </div>

            <div className="premium-hero-stats" aria-label="IPO Lens market snapshot">
              <div>
                <span>Open IPOs</span>
                <strong>{openCount}</strong>
              </div>
              <div>
                <span>Strong signals</span>
                <strong>{strongCount}</strong>
              </div>
              <div>
                <span>Avg GMP</span>
                <strong>{avgGMP >= 0 ? "+" : ""}{avgGMP.toFixed(1)}%</strong>
                <em>unofficial</em>
              </div>
            </div>
          </div>

          <div className="home-score-stage" aria-label={`IPO Lens score ${featuredScore.score} out of 100`}>
            <div className="home-score-halo" aria-hidden="true" />
            <div className="home-score-orbit home-score-orbit-one" aria-hidden="true" />
            <div className="home-score-orbit home-score-orbit-two" aria-hidden="true" />
            <div className="home-score-orbit home-score-orbit-three" aria-hidden="true" />
            <div className={`home-score-center ${featuredScoreTone}`}>
              <span>IPO Score</span>
              <strong>{featuredScore.score}<em>/100</em></strong>
              <p>{featuredSignalLabel}</p>
            </div>
            <div className="home-score-arc home-score-arc-green" aria-hidden="true" />
            <div className="home-score-arc home-score-arc-blue" aria-hidden="true" />
            <div className="home-score-arc home-score-arc-amber" aria-hidden="true" />
            <div className="home-score-dot home-score-dot-one" aria-hidden="true" />
            <div className="home-score-dot home-score-dot-two" aria-hidden="true" />
            <div className="home-score-dot home-score-dot-three" aria-hidden="true" />
            <div className="home-score-dot home-score-dot-four" aria-hidden="true" />

            <div className="home-signal-card home-signal-gmp">
              <TrendingUp size={18} />
              <span>GMP Momentum</span>
              <strong>{featuredPremium >= 0 ? "+" : ""}{featuredPremium.toFixed(1)}%</strong>
            </div>
            <div className="home-signal-card home-signal-subscription">
              <UsersRound size={18} />
              <span>Subscription</span>
              <strong>{featuredSubscription ? `${featuredSubscription.toFixed(0)}x` : "TBA"}</strong>
            </div>
            <div className="home-signal-card home-signal-fundamentals">
              <FileText size={18} />
              <span>Fundamentals</span>
              <strong>{featuredScore.score >= 60 ? "Strong" : "Review"}</strong>
            </div>
            <div className="home-signal-card home-signal-valuation">
              <Target size={18} />
              <span>Valuation</span>
              <strong>{featuredScore.score >= 60 ? "Comfortable" : "Review"}</strong>
            </div>
            <div className="home-signal-card home-signal-risk">
              <AlertTriangle size={18} />
              <span>Risk Assessment</span>
              <strong>{featuredRiskLabel}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="section home-featured-section">
        <div className="shell">
          <HomeFeaturedIPO ipo={featured} score={featuredScore.score} />
        </div>
      </section>

      <section className="section home-thinking-section" id="methodology">
        <div className="shell">
          <div className="section-head home-centered-head">
            <div>
              <h2>How <span>IPO Lens</span> thinks</h2>
              <p>Our research process turns scattered IPO data into a clearer educational view.</p>
            </div>
          </div>

          <div className="home-thinking-card" aria-label="IPO Lens research process">
            {thinkingSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div className="home-thinking-step" data-tone={step.tone} key={step.title}>
                  <div className="home-thinking-icon">
                    <Icon size={24} />
                    <small>{index + 1}</small>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.copy}</p>
                  {index < thinkingSteps.length - 1 ? <span className="home-thinking-arrow" aria-hidden="true" /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <TodayIPOCalendar ipos={allIPOs} />

      <section className="section" id="ipos">
        <div className="shell home-research-layout">
          <div>
            <div className="section-head compact">
              <div>
                <h2>Live IPO Research</h2>
                <p>Track open and upcoming issues through score, GMP, demand and risk context.</p>
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
                  {visibleIPOs.slice(0, 12).map((ipo, index) => (
                    <IPOCard index={index} ipo={ipo} key={ipo.id} />
                  ))}
                </div>
                {visibleIPOs.length > 12 ? (
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
        </div>
      </section>

      <section className="section home-learn-section">
        <div className="shell">
          <div className="section-head compact">
            <div>
              <h2>New to IPOs? Learn before you apply.</h2>
              <p>Simple guides that explain IPO terms, risks and process in beginner-friendly English.</p>
            </div>
            <ButtonLink href="/learn" variant="secondary">
              Explore Learn <ArrowRight size={15} />
            </ButtonLink>
          </div>

          <div className="home-learn-grid">
            {learnCards.map((card) => {
              const Icon = card.icon;

              return (
                <a className="home-learn-card" data-tone={card.tone} href={card.href} key={card.title}>
                  <span className="home-learn-icon">
                    <Icon size={26} />
                  </span>
                  <h3>{card.title}</h3>
                  <p>{card.copy}</p>
                  <strong>Read More <ArrowRight size={14} /></strong>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section home-trust-section">
        <div className="shell home-trust-grid">
          <div>
            <ShieldCheck size={22} />
            <strong>Rule-based & transparent</strong>
            <span>No hidden recommendation language</span>
          </div>
          <div>
            <FileText size={22} />
            <strong>Data from trusted sources</strong>
            <span>BSE, NSE, SEBI and public filings</span>
          </div>
          <div>
            <GraduationCap size={22} />
            <strong>For educational purposes</strong>
            <span>Not investment advice</span>
          </div>
          <div>
            <CheckCircle2 size={22} />
            <strong>Trusted by retail investors</strong>
            <span>Plain-English research clarity</span>
          </div>
        </div>
      </section>
    </main>
  );
}
