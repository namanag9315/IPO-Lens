import Link from "next/link";
import { format } from "date-fns";
import { Bookmark } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { calculateScore, estimateListingGainPct } from "@/lib/scoring";
import type { AIAnalysisLabel, ComputedIPO, IPOStatus } from "@/types/ipo";
import { extractDomain, cleanAndFilterFinancials, guessCompanyDomain } from "@/lib/mappers/researchMapper";
import CompanyLogo from "@/components/ui/CompanyLogo";
import ScoreRing from "@/components/ui/ScoreRing";

interface IPOCardProps {
  ipo: ComputedIPO;
  index: number;
}

function derivedScore(ipo: ComputedIPO): { label: AIAnalysisLabel; score: number } {
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

function scoreTone(score: number) {
  if (score >= 71) {
    return "strong";
  }
  if (score >= 51) {
    return "moderate";
  }
  return "weak";
}

function statusTone(status: IPOStatus) {
  if (status === "open") {
    return "green";
  }
  if (status === "listed") {
    return "blue";
  }
  if (status === "closed") {
    return "slate";
  }
  return "amber";
}

function exchangeLine(ipo: ComputedIPO) {
  return `${ipo.category === "sme" ? "SME" : "MAIN"} · NSE/BSE`;
}

function formatDateRange(openDate: string | null, closeDate: string | null) {
  if (!openDate && !closeDate) return "";
  try {
    const openStr = openDate ? format(new Date(openDate), "d MMM") : "TBA";
    const closeStr = closeDate ? format(new Date(closeDate), "d MMM") : "TBA";
    return `${openStr} - ${closeStr}`;
  } catch {
    return "";
  }
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

function cleanLabelForUI(label: string): string {
  const l = label.trim();
  if (l === "Strong Apply") return "Strong Research";
  if (l === "Apply") return "Positive Research";
  if (l === "Neutral") return "Neutral Research";
  if (l === "Avoid") return "Weak Research";
  if (l === "Strong signal") return "Strong Research";
  if (l === "Positive signal") return "Positive Research";
  if (l === "Neutral signal") return "Neutral Research";
  if (l === "Weak signal") return "Weak Research";
  return l;
}

export default function IPOCard({ ipo, index }: IPOCardProps) {
  const signal = derivedScore(ipo);
  const premium = estimateListingGainPct(ipo.latest_gmp ?? 0, ipo.price_band_high) ?? 0;
  const totalSubscription = ipo.latest_subscription?.total_x ?? 0;
  const tone = scoreTone(signal.score);

  return (
    <Card
      as={Link}
      className={`ipo-signal-card ${tone} status-${ipo.status}`}
      href={`/ipo/${ipo.slug}`}
      style={{
        animation: "row-in 200ms ease-out both",
        animationDelay: `${index * 40}ms`,
        backgroundColor: "#ffffff",
        color: "#1e293b",
      }}
    >
      <div className="ipo-signal-top">
        <div className="ipo-avatar relative flex items-center justify-center">
          <CompanyLogo domain={extractDomain(ipo.company_profile?.website) || guessCompanyDomain(ipo.name)} name={ipo.name} />
        </div>
        <div>
          <h3>{ipo.name}</h3>
          <p>
            {exchangeLine(ipo)}
            {formatDateRange(ipo.open_date, ipo.close_date) && ` • ${formatDateRange(ipo.open_date, ipo.close_date)}`}
          </p>
        </div>
        <Badge tone={statusTone(ipo.status)}>{ipo.status.toUpperCase()}</Badge>
      </div>

      <div className="ipo-card-score-panel">
        <div className="ipo-card-score-ring">
          <ScoreRing score={signal.score} size={72} />
        </div>
        <div>
          <span>IPO Score</span>
          <strong>{signal.score}<em>/100</em></strong>
          <p className={tone}>{cleanLabelForUI(signal.label)}</p>
        </div>
      </div>

      <div className="ipo-signal-metrics">
        <div>
          <span className="tooltip-trigger" data-tooltip="GMP is unofficial grey market information and may be inaccurate, volatile or misleading. It is not a guaranteed indicator of listing price or returns.">
            GMP ⓘ
          </span>
          <strong className={`mono ${premium >= 0 ? "data-positive" : "data-negative"}`}>
            {premium >= 0 ? "+" : ""}
            {premium.toFixed(0)}%
          </strong>
        </div>
        <div>
          <span>Subscription</span>
          <strong className="mono">{totalSubscription ? `${totalSubscription.toFixed(0)}x` : "—"}</strong>
        </div>
        <div>
          <span>Price Band</span>
          <strong className="mono">{priceBand(ipo)}</strong>
        </div>
        <div>
          <span>Closes On</span>
          <strong className="mono">{closeLabel(ipo)}</strong>
        </div>
      </div>

      <div className="ipo-signal-foot">
        <span className={`home-signal-pill ${tone}`}>{cleanLabelForUI(signal.label)}</span>
        <Bookmark aria-hidden="true" size={16} />
      </div>
    </Card>
  );
}
