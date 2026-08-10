import Link from "next/link";
import { Bookmark } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { getDataFreshness, relativeUpdatedTime } from "@/lib/ipo-data/dataFreshness";
import { isSMECategory } from "@/lib/ipoCategory";
import { calculateScore, estimateListingGainPct } from "@/lib/scoring";
import type { AIAnalysisLabel, ComputedIPO, IPOStatus } from "@/types/ipo";

interface IPOCardProps {
  ipo: ComputedIPO;
  index: number;
}

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

function derivedScore(ipo: ComputedIPO): { label: AIAnalysisLabel; score: number } {
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
    return "slate";
  }

  if (status === "closed") {
    return "slate";
  }

  return "amber";
}

function exchangeLine(ipo: ComputedIPO) {
  return `${isSMECategory(ipo.category) ? "SME" : "MAIN"} · NSE/BSE`;
}

function freshnessClass(capturedAt: string | null | undefined) {
  return getDataFreshness(capturedAt).toLowerCase();
}

function valueTone(value: number | null) {
  return value === null ? "" : value > 0 ? "data-positive" : value < 0 ? "data-negative" : "";
}

function percentLabel(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function IPOCard({ ipo, index }: IPOCardProps) {
  const signal = derivedScore(ipo);
  const latestGmp = ipo.latest_gmp ?? null;
  const premium = ipo.latest_gmp_percent ?? estimateListingGainPct(latestGmp, ipo.latest_public_gmp_snapshot?.issue_price ?? ipo.price_band_high);
  const totalSubscription = ipo.latest_subscription?.total_x ?? 0;
  const retailSubscription = ipo.latest_subscription?.retail_x ?? null;
  const tone = scoreTone(signal.score);
  const gmpSnapshot = ipo.latest_public_gmp_snapshot;
  const subscriptionSnapshot = ipo.latest_public_subscription_snapshot;

  return (
    <Card
      as={Link}
      className={`ipo-signal-card ${tone}`}
      href={`/ipo/${ipo.slug}`}
      style={{
        animation: "row-in 200ms ease-out both",
        animationDelay: `${index * 40}ms`,
      }}
    >
      <div className="ipo-signal-top">
        <div className="ipo-avatar">{initials(ipo.name)}</div>
        <div>
          <h3>{ipo.name}</h3>
          <p>{exchangeLine(ipo)}</p>
        </div>
        <Badge tone={statusTone(ipo.status)}>{ipo.status.toUpperCase()}</Badge>
      </div>

      <div className="ipo-signal-metrics">
        <div>
          <span>Score</span>
          <strong className="mono">{signal.score}</strong>
          <em className={tone}>{signal.label}</em>
        </div>
        <div>
          <span>GMP</span>
          <strong className={`mono ${valueTone(premium)}`}>
            {premium === null ? "NA" : percentLabel(premium)}
          </strong>
          <small>
            {latestGmp === null ? "No public snapshot" : `GMP ₹${latestGmp}`}
            {latestGmp !== null && premium === null ? " · Premium NA" : ""}
            {gmpSnapshot ? (
              <>
                {" · "}
                {gmpSnapshot.source ?? "Public source"} · {relativeUpdatedTime(gmpSnapshot.captured_at).replace("Updated ", "")}
                <span className={`freshness-pill ${freshnessClass(gmpSnapshot.captured_at)}`} style={{ marginLeft: 6 }}>
                  {getDataFreshness(gmpSnapshot.captured_at)}
                </span>
              </>
            ) : null}
          </small>
        </div>
        <div>
          <span>Subs. (x)</span>
          <strong className="mono">{totalSubscription ? `${totalSubscription.toFixed(0)}x` : "NA"}</strong>
          <small>
            {retailSubscription ? `Retail ${retailSubscription.toFixed(1)}x` : "Retail NA"}
            {subscriptionSnapshot ? (
              <>
                {" · "}
                {subscriptionSnapshot.source ?? "Public source"} · {relativeUpdatedTime(subscriptionSnapshot.captured_at).replace("Updated ", "")}
              </>
            ) : null}
          </small>
        </div>
      </div>

      <div className="ipo-signal-foot">
        <span>{ipo.company_profile?.sector ?? "Sector NA"}</span>
        <Bookmark aria-hidden="true" size={16} />
      </div>
    </Card>
  );
}
