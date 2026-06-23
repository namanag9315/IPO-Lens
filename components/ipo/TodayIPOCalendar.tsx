"use client";

import { Building2, CalendarCheck, TrendingUp, Target } from "lucide-react";
import { differenceInCalendarDays, format, parseISO, startOfDay, isWithinInterval, isSameDay } from "date-fns";
import IPOEventCard from "@/components/ipo/IPOEventCard";
import { calculateScore } from "@/lib/scoring";
import { cleanAndFilterFinancials, extractDomain, guessCompanyDomain } from "@/lib/mappers/researchMapper";
import type { ComputedIPO } from "@/types/ipo";

function closeLabel(closeDate: string) {
  const days = differenceInCalendarDays(startOfDay(parseISO(closeDate)), startOfDay(new Date()));

  if (days === 0) {
    return "closes today";
  }

  if (days === 1) {
    return "closes tomorrow";
  }

  return `closes in ${days} days`;
}

function parseDate(value: string) {
  return startOfDay(parseISO(value));
}

export default function TodayIPOCalendar({ ipos }: { ipos: ComputedIPO[] }) {
  const today = startOfDay(new Date());

  const openIPOs = ipos.filter((ipo) => ipo.status === "open");

  const allotments = ipos.filter((ipo) => {
    const allotmentDate = ipo.enriched_data?.allotment_date as string | undefined;
    if (!allotmentDate) return false;
    return isSameDay(parseDate(allotmentDate), today);
  });

  const listings = ipos.filter((ipo) => {
    if (!ipo.listing_date) return false;
    return isSameDay(parseDate(ipo.listing_date), today);
  });

  const strongSignals = ipos.filter((ipo) => {
    const scoreResult = calculateScore({
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
    return scoreResult.score >= 71;
  });

  return (
    <section className="section today-ipo-section" aria-labelledby="today-ipo-calendar">
      <div className="shell">
        <div className="section-head compact">
          <div>
            <h2 id="today-ipo-calendar">Today&apos;s IPO Command Center</h2>
            <p>Snapshot of today&apos;s IPO activity · <span className="mono">{format(new Date(), "dd MMM yyyy")}</span></p>
          </div>
        </div>

        <div className="today-ipo-grid">
          <IPOEventCard
            accent="green"
            count={openIPOs.length}
            ctaHref="/?filter=open#ipos"
            ctaLabel="View all open IPOs"
            description="IPOs accepting bids today"
            emptyText="No IPOs open today"
            icon={<TrendingUp size={18} />}
            rows={openIPOs.map((ipo) => ({
              badge: { label: "Open", tone: "green" },
              domain: extractDomain(ipo.company_profile?.website) || guessCompanyDomain(ipo.name),
              href: `/ipo/${ipo.slug}`,
              meta: <span className="mono">{ipo.close_date ? closeLabel(ipo.close_date) : "closes NA"}</span>,
              title: ipo.name,
            }))}
            title="Open Now"
          />
          <IPOEventCard
            accent="amber"
            count={allotments.length}
            ctaHref="/allotment"
            ctaLabel="Check allotment"
            description="Allotments expected today"
            emptyText="No allotments scheduled today"
            icon={<CalendarCheck size={18} />}
            rows={allotments.map((ipo) => ({
              badge: { label: "Expected", tone: "amber" },
              domain: extractDomain(ipo.company_profile?.website) || guessCompanyDomain(ipo.name),
              href: `/ipo/${ipo.slug}`,
              meta: ipo.registrar_name ?? "Registrar NA",
              title: ipo.name,
            }))}
            title="Allotment Today"
          />
          <IPOEventCard
            accent="blue"
            count={listings.length}
            ctaHref="/performance"
            ctaLabel="View listing performance"
            description="IPOs debuting on exchange"
            emptyText="No listings today"
            icon={<Building2 size={18} />}
            rows={listings.map((ipo) => {
              const gain = ipo.listing_performance?.listing_gain_pct ?? null;

              return {
                badge: gain === null ? { label: "Listing", tone: "blue" as const } : undefined,
                domain: extractDomain(ipo.company_profile?.website) || guessCompanyDomain(ipo.name),
                href: `/ipo/${ipo.slug}`,
                meta: (
                  <>
                    <span className="mono">₹{ipo.price_band_high ?? "NA"}</span> · {((ipo.enriched_data?.exchange as string | undefined) ?? "Exchange NA")}
                  </>
                ),
                right:
                  gain === null ? undefined : (
                    <span className="mono data-positive" style={{ fontSize: 12, fontWeight: 900 }}>
                      {gain > 0 ? '+' : ''}{gain.toFixed(1)}%
                    </span>
                  ),
                title: ipo.name,
              };
            })}
            title="Listing Today"
          />
          <IPOEventCard
            accent="purple"
            count={strongSignals.length}
            ctaHref="/?filter=strong#ipos"
            ctaLabel="View all strong research signals"
            description="IPOs with score above 70"
            emptyText="No strong research signals today"
            icon={<Target size={18} />}
            rows={strongSignals.map((ipo) => {
              const scoreResult = calculateScore({
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

              return {
                domain: extractDomain(ipo.company_profile?.website) || guessCompanyDomain(ipo.name),
                href: `/ipo/${ipo.slug}`,
                meta: ipo.category === "sme" ? "SME • NSE/BSE" : "MAIN • NSE/BSE",
                right: (
                  <span className="mono font-extrabold text-emerald-600" style={{ fontSize: 12, fontWeight: 900 }}>
                    {scoreResult.score}
                  </span>
                ),
                title: ipo.name,
              };
            })}
            title="Strong Research Signals"
          />
        </div>
      </div>
    </section>
  );
}
