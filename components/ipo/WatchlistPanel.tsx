import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { isSMECategory } from "@/lib/ipoCategory";
import { calculateScore, estimateListingGainPct } from "@/lib/scoring";
import type { ComputedIPO } from "@/types/ipo";

interface WatchlistPanelProps {
  ipos: ComputedIPO[];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function score(ipo: ComputedIPO) {
  if (ipo.ai_analysis?.score !== null && ipo.ai_analysis?.score !== undefined) {
    return ipo.ai_analysis.score;
  }

  return calculateScore({
    gmp: ipo.latest_gmp ?? 0,
    issuePrice: ipo.latest_public_gmp_snapshot?.issue_price ?? ipo.price_band_high ?? 0,
    issueSizeCr: ipo.issue_size_cr ?? 0,
    niiX: ipo.latest_subscription?.nii_x ?? 0,
    qibX: ipo.latest_subscription?.qib_x ?? 0,
    retailX: ipo.latest_subscription?.retail_x ?? 0,
    totalX: ipo.latest_subscription?.total_x ?? 0,
  }).score;
}

function valueTone(value: number | null) {
  return value === null ? "" : value > 0 ? "data-positive" : value < 0 ? "data-negative" : "";
}

function percentLabel(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
}

export default function WatchlistPanel({ ipos }: WatchlistPanelProps) {
  const watchlist = ipos
    .slice()
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);

  return (
    <Card className="watchlist-panel" id="watchlist">
      <div className="watchlist-head">
        <h3>My Watchlist</h3>
        <MoreHorizontal size={18} />
      </div>

      <div className="watchlist-list">
        {watchlist.length === 0 ? (
          <div className="watchlist-empty">
            <strong>No live IPOs available yet.</strong>
            <span>Run the public data sync after adding IPO records in Supabase.</span>
          </div>
        ) : null}
        {watchlist.map((ipo) => {
          const itemScore = score(ipo);
          const gmp = ipo.latest_gmp_percent ?? estimateListingGainPct(ipo.latest_gmp, ipo.latest_public_gmp_snapshot?.issue_price ?? ipo.price_band_high);
          const subscription = ipo.latest_subscription?.total_x ?? 0;

          return (
            <Link className="watchlist-row" href={`/ipo/${ipo.slug}`} key={ipo.id}>
              <span className="watchlist-avatar">{initials(ipo.name)}</span>
              <span className="watchlist-main">
                <strong>{ipo.name}</strong>
                <em>{isSMECategory(ipo.category) ? "SME" : "MAIN"} · NSE/BSE</em>
              </span>
              <Badge className="watchlist-status" tone={ipo.status === "open" ? "green" : ipo.status === "listed" ? "slate" : "amber"}>{ipo.status.toUpperCase()}</Badge>
              <span className="watchlist-metrics">
                <span className="mono watchlist-score">{itemScore}<small>Score</small></span>
                <span className={`mono ${valueTone(gmp)}`}>
                  {gmp === null ? "NA" : percentLabel(gmp)}
                  <small>GMP</small>
                </span>
                <span className="mono">{subscription ? `${subscription.toFixed(0)}x` : "NA"}<small>Subs. (x)</small></span>
              </span>
            </Link>
          );
        })}
      </div>

      <Link className="watchlist-link" href="/#ipos">
        View full watchlist →
      </Link>
    </Card>
  );
}
