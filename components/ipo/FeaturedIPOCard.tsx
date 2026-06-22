import Link from "next/link";
import { format } from "date-fns";
import { Check, AlertTriangle } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { estimateListingGainPct, calculateScore } from "@/lib/scoring";
import { cleanAndFilterFinancials, extractDomain, guessCompanyDomain } from "@/lib/mappers/researchMapper";
import CompanyLogo from "@/components/ui/CompanyLogo";
import LearnButton from "@/components/learn/LearnButton";

function initials(name: string) {
  return name
    .replace(/\b(IPO|Limited|Ltd)\b/gi, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
import type { AIAnalysisLabel, ComputedIPO } from "@/types/ipo";

interface FeaturedIPOCardProps {
  ipo: ComputedIPO | null;
  label: AIAnalysisLabel | string;
  score: number;
}

function priceBand(ipo: ComputedIPO) {
  if (!ipo.price_band_low || !ipo.price_band_high) {
    return "TBA";
  }

  return `₹${ipo.price_band_low} – ₹${ipo.price_band_high}`;
}

function dateLabel(value: string | null) {
  return value ? format(new Date(value), "dd MMM yyyy") : "TBA";
}

function MiniSpark({ values, positive = true }: { positive?: boolean; values: number[] }) {
  const max = Math.max(...values, 1);

  return (
    <div className="mini-spark" aria-hidden="true">
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          style={{
            background: positive ? "var(--green)" : "var(--line-strong)",
            height: `${Math.max(4, (value / max) * 28)}px`,
            opacity: index < values.length - 2 ? 0.45 : 1,
          }}
        />
      ))}
    </div>
  );
}

interface WhyScorePoint {
  type: "check" | "alert" | "neutral";
  text: string;
}

function getWhyScorePoints(ipo: ComputedIPO, score: number): WhyScorePoint[] {
  const points: WhyScorePoint[] = [];

  // Calculate score breakdown
  const breakdownResult = calculateScore({
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

  const breakdown = breakdownResult.breakdown;
  const premium = estimateListingGainPct(ipo.latest_gmp ?? 0, ipo.price_band_high) ?? 0;
  const subs = ipo.latest_subscription?.total_x ?? 0;

  // 1. Subscription demand point
  if (subs >= 50) {
    points.push({ type: "check", text: "Very high subscription demand" });
  } else if (subs >= 10) {
    points.push({ type: "check", text: "Strong subscription demand" });
  } else if (subs > 0) {
    points.push({ type: "check", text: "Moderate subscription demand" });
  } else {
    points.push({ type: "neutral", text: "Subscription demand details pending" });
  }

  // 2. GMP Momentum point
  if (premium >= 35) {
    points.push({ type: "check", text: "Strong GMP momentum" });
  } else if (premium >= 15) {
    points.push({ type: "check", text: "Positive GMP premium" });
  } else if (premium > 0) {
    points.push({ type: "check", text: "Moderate GMP premium" });
  } else {
    points.push({ type: "neutral", text: "Subdued grey market demand" });
  }

  // 3. Issue Size / Liquidity support
  if (ipo.category === "sme") {
    points.push({ type: "alert", text: "SME IPO: higher liquidity risk" });
  } else if (ipo.issue_size_cr && ipo.issue_size_cr >= 500) {
    points.push({ type: "check", text: "Large issue size supports liquidity" });
  } else {
    points.push({ type: "check", text: "Issue size supports demand" });
  }

  // 4. Fundamentals / Anchor book quality
  if (breakdown.anchorInvestorQuality >= 7) {
    points.push({ type: "check", text: "High quality marquee anchor book" });
  } else if (breakdown.fundamentals >= 15) {
    points.push({ type: "check", text: "Consistent financial track record" });
  } else if (breakdown.fundamentals < 8) {
    points.push({ type: "alert", text: "Volatile or weak financial history" });
  }

  return points.slice(0, 4); // Limit to top 4 points
}

function cleanLabelForUI(label: string): string {
  const l = label.trim();
  if (l === "Strong Apply") return "Strong Research Signal";
  if (l === "Apply") return "Positive Research Signal";
  if (l === "Neutral") return "Neutral Research Signal";
  if (l === "Avoid") return "Weak Research Signal";
  if (l === "Strong signal") return "Strong Research Signal";
  if (l === "Positive signal") return "Positive Research Signal";
  if (l === "Neutral signal") return "Neutral Research Signal";
  if (l === "Weak signal") return "Weak Research Signal";
  return l;
}

export default function FeaturedIPOCard({ ipo, label, score }: FeaturedIPOCardProps) {
  if (!ipo) {
    return (
      <Card className="featured-card">
        <p style={{ color: "var(--muted)", fontSize: 14 }}>No featured IPO available yet.</p>
      </Card>
    );
  }

  const latestGmp = ipo.latest_gmp ?? 0;
  const gmpPremium = estimateListingGainPct(latestGmp, ipo.price_band_high) ?? 0;
  const retailDemand = ipo.latest_subscription?.retail_x ?? 0;
  const totalDemand = ipo.latest_subscription?.total_x ?? 0;
  const gaugeOffset = 251.2 - (Math.min(score, 100) / 100) * 251.2;

  const scorePoints = getWhyScorePoints(ipo, score);

  let plainEnglishSummary = "Signal quality is calculated from GMP, subscription and issue details.";
  if (ipo.ai_analysis?.summary) {
    try {
      const parsed = JSON.parse(ipo.ai_analysis.summary);
      plainEnglishSummary = parsed.summary || ipo.ai_analysis.summary;
    } catch {
      plainEnglishSummary = ipo.ai_analysis.summary;
    }
  }

  return (
    <Card className="featured-card">
      <div className="featured-card-head">
        <div className="card-title">Today&apos;s Featured IPO</div>
        <div className="live-research"><span /> Live research view</div>
      </div>

      <div className="featured-card-body">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div className="ipo-avatar relative flex items-center justify-center" style={{ width: 42, height: 42, flexShrink: 0, fontSize: 14 }}>
              <CompanyLogo domain={extractDomain(ipo.company_profile?.website) || guessCompanyDomain(ipo.name)} name={ipo.name} />
            </div>
            <div>
              <h2 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>{ipo.name}</h2>
              <p style={{ marginTop: 2, margin: 0 }}>{ipo.category?.toUpperCase() ?? "IPO"} · {ipo.exchange || "NSE/BSE"} · ₹{ipo.issue_size_cr ?? "NA"}Cr issue</p>
            </div>
          </div>
          <div className="featured-score-line">
            <div>
              <div className="metric-learn-label">
                <span className="tooltip-trigger" data-tooltip="IPO Lens Score is a rule-based educational signal based on available data such as financials, valuation, GMP, subscription, issue details and risk factors. It is not a recommendation or guarantee of returns." style={{ borderBottom: "1px dashed var(--line-strong)", cursor: "help" }}>
                  IPO Score ⓘ
                </span>
                <LearnButton topic="ipoScore" variant="icon" />
              </div>
              <strong className="mono">{score}<em>/100</em></strong>
            </div>
            <div className="featured-signal">
              <span>Signal</span>
              <strong style={{ color: score >= 71 ? "var(--green)" : score >= 51 ? "var(--amber)" : "var(--red)" }}>{cleanLabelForUI(label)}</strong>
            </div>
            <Badge tone={ipo.status === "open" ? "green" : ipo.status === "listed" ? "blue" : "amber"}>{ipo.status.toUpperCase()}</Badge>
          </div>

          {/* "Why this score?" Panel */}
          <div className="why-score-box">
            <h4>Why this score?</h4>
            <div className="why-score-items">
              {scorePoints.map((point, i) => (
                <div className={`why-score-item ${point.type}`} key={i}>
                  {point.type === "check" && <Check size={14} />}
                  {point.type === "alert" && <AlertTriangle size={14} />}
                  {point.type === "neutral" && <Check size={14} className="opacity-40" />}
                  <span>{point.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Needleless modern gauge with center-aligned text */}
        <div className="featured-gauge" aria-label={`IPO Lens Score ${score} out of 100`}>
          <svg viewBox="0 0 160 90" role="img">
            <path d="M20 80a60 60 0 0 1 120 0" fill="none" stroke="#E2E8F0" strokeLinecap="round" strokeWidth="16" />
            <path
              d="M20 80a60 60 0 0 1 120 0"
              fill="none"
              stroke={score >= 71 ? "var(--green)" : score >= 51 ? "var(--amber)" : "var(--red)"}
              strokeDasharray="251.2"
              strokeDashoffset={gaugeOffset}
              strokeLinecap="round"
              strokeWidth="16"
            />
            {/* Centered text display inside gauge arc */}
            <text x="80" y="58" textAnchor="middle" fontSize="32" fontWeight="900" fill="var(--primary-navy)">
              {score}
            </text>
            <text
              x="80"
              y="76"
              textAnchor="middle"
              fontSize="11"
              fontWeight="800"
              fill={score >= 71 ? "var(--green)" : score >= 51 ? "var(--amber)" : "var(--red)"}
            >
              {score >= 71 ? "Strong" : score >= 51 ? "Moderate" : "Weak"}
            </text>
          </svg>
        </div>
      </div>

      <div className="featured-progress">
        <span style={{ width: `${Math.min(score, 100)}%` }} />
      </div>

      <div className="featured-metrics">
        <div>
          <div className="metric-learn-label">
            <span className="tooltip-trigger" data-tooltip="GMP is unofficial grey market information and may be inaccurate, volatile or misleading. It is not a guaranteed indicator of listing price or returns." style={{ borderBottom: "1px dashed var(--line-strong)", cursor: "help" }}>
              GMP ⓘ
            </span>
            <LearnButton topic="gmp" variant="icon" />
          </div>
          <strong className="mono data-positive">₹{latestGmp} · +{gmpPremium.toFixed(1)}%</strong>
          <MiniSpark values={ipo.gmp_history.map((item) => item.gmp_value).slice(-8)} />
        </div>
        <div>
          <div className="metric-learn-label">
            <span>Total Subscription</span>
            <LearnButton topic="subscription" variant="icon" />
          </div>
          <strong className="mono">{totalDemand.toFixed(1)}x</strong>
          <MiniSpark values={[1, 2, 2, 4, 5, 7, totalDemand]} />
        </div>
        <div>
          <span>Retail Demand</span>
          <strong className="mono">{retailDemand.toFixed(1)}x</strong>
          <MiniSpark values={[1, 1, 2, 4, 5, retailDemand]} />
        </div>
        <div>
          <div className="metric-learn-label">
            <span>Price Band</span>
            <LearnButton topic="priceBand" variant="icon" />
          </div>
          <strong className="mono">{priceBand(ipo)}</strong>
        </div>
        <div>
          <div className="metric-learn-label">
            <span>Lot Size</span>
            <LearnButton topic="lotSize" variant="icon" />
          </div>
          <strong className="mono">{ipo.lot_size ?? "TBA"}</strong>
        </div>
        <div>
          <span>Closes On</span>
          <strong className="mono">{dateLabel(ipo.close_date)}</strong>
        </div>
      </div>

      <div className="plain-view-box">
        <div>
          <span className="tooltip-trigger" data-tooltip="This summary is AI-assisted and generated from available source data. It may be incomplete or inaccurate. Please verify from official IPO documents." style={{ borderBottom: "1px dashed var(--line-strong)", cursor: "help" }}>
            Plain-English view ⓘ
          </span>
          <p>{plainEnglishSummary}</p>
        </div>
        <Link href={`/ipo/${ipo.slug}`}>View full analysis →</Link>
      </div>
    </Card>
  );
}
