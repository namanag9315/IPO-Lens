import Link from "next/link";
import { format } from "date-fns";
import { Bookmark } from "lucide-react";
import Card from "@/components/ui/Card";
import { calculateScore, estimateListingGainPct } from "@/lib/scoring";
import type { ComputedIPO } from "@/types/ipo";
import { extractDomain, cleanAndFilterFinancials, guessCompanyDomain } from "@/lib/mappers/researchMapper";
import CompanyLogo from "@/components/ui/CompanyLogo";
import ScoreRing from "@/components/ui/ScoreRing";

interface IPOCardProps {
  ipo: ComputedIPO;
  index: number;
}

function derivedScore(ipo: ComputedIPO) {
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

function priceBand(ipo: ComputedIPO) {
  if (!ipo.price_band_low || !ipo.price_band_high) {
    return "—";
  }
  return `₹${ipo.price_band_low} - ₹${ipo.price_band_high}`;
}

function closeLabel(ipo: ComputedIPO) {
  if (ipo.status === "listed") {
    return "Listed";
  }
  if (!ipo.close_date) {
    return ipo.status === "upcoming" ? "Upcoming" : "—";
  }
  try {
    return format(new Date(ipo.close_date), "dd MMM yyyy");
  } catch {
    return "—";
  }
}

export default function IPOCard({ ipo, index }: IPOCardProps) {
  const signal = derivedScore(ipo);
  const premium = estimateListingGainPct(ipo.latest_gmp ?? 0, ipo.price_band_high) ?? 0;
  const totalSubscription = ipo.latest_subscription?.total_x ?? 0;

  // Verdict mapping matching the premium financial layout
  const cleanLabel = (signal.label ?? "").toLowerCase();
  let verdictText = "Neutral";
  let verdictClass = "neutral";
  
  if (signal.score >= 68 || cleanLabel.includes("apply") || cleanLabel.includes("strong")) {
    verdictText = "Positive";
    verdictClass = "positive";
  } else if (signal.score <= 45 || cleanLabel.includes("avoid") || cleanLabel.includes("weak")) {
    verdictText = "Avoid";
    verdictClass = "avoid";
  }

  const sector = ipo.company_profile?.sector || "Financial Services";
  const location = ipo.company_profile?.headquarters
    ? ipo.company_profile.headquarters.split(",")[0].trim()
    : "India";

  const retailSubscription = ipo.latest_subscription?.retail_x;
  const subscriptionSubtext = retailSubscription
    ? `Retail: ${retailSubscription.toFixed(0)}x`
    : "Total Demand";

  return (
    <Card
      as={Link}
      className={`ipo-premium-card ${verdictClass}`}
      href={`/ipo/${ipo.slug}`}
      style={{
        animation: "row-in 200ms ease-out both",
        animationDelay: `${index * 40}ms`,
        backgroundColor: "#ffffff",
        color: "#1e293b",
      }}
    >
      {/* 1. Header Section */}
      <div className="card-header-row">
        <div className="card-logo-container">
          <CompanyLogo
            domain={extractDomain(ipo.company_profile?.website) || guessCompanyDomain(ipo.name)}
            name={ipo.name}
          />
        </div>
        <div className="info-col">
          <div className="title-row">
            <h3>{ipo.name}</h3>
            <span className="category-badge">{ipo.category === "sme" ? "SME" : "MAIN"}</span>
          </div>
          <p className="sector-location-text">{sector} · {location}</p>
        </div>
      </div>

      {/* 2. Score & Key Metrics Section */}
      <div className="card-body-row">
        <div className="score-ring-col">
          <ScoreRing score={signal.score} size={64} />
          <span className="score-ring-label">IPO SCORE</span>
        </div>

        <div className="metrics-col">
          <div className="metric-box">
            <span className="metric-label">GMP</span>
            <strong className={`metric-value ${premium >= 0 ? "text-green" : "text-red"}`}>
              {premium >= 0 ? "+" : ""}
              {premium.toFixed(1)}%
            </strong>
            <span className="metric-subtext">
              {ipo.latest_gmp !== null ? `₹${ipo.latest_gmp}` : "—"}
            </span>
          </div>

          <div className="metric-box">
            <span className="metric-label">Subs</span>
            <strong className="metric-value">
              {totalSubscription ? `${totalSubscription.toFixed(1)}x` : "—"}
            </strong>
            <span className="metric-subtext">{subscriptionSubtext}</span>
          </div>
        </div>
      </div>

      {/* 3. Details Row (Price Band & Closes On) */}
      <div className="card-details-row">
        <div className="detail-box">
          <span className="detail-label">Price Band</span>
          <strong className="detail-value">{priceBand(ipo)}</strong>
        </div>
        <div className="detail-box">
          <span className="detail-label">Closes On</span>
          <strong className="detail-value">{closeLabel(ipo)}</strong>
        </div>
      </div>

      {/* 4. Footer Verdict Row */}
      <div className="card-footer-row">
        <span className={`verdict-badge ${verdictClass}`}>
          <span className="verdict-dot" />
          {verdictText}
        </span>
        <button
          className="bookmark-btn"
          aria-label="Bookmark IPO"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Bookmark size={15} />
        </button>
      </div>
    </Card>
  );
}
