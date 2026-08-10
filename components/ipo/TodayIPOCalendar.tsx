import { Building2, CalendarCheck, TrendingUp } from "lucide-react";
import { differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import IPOEventCard from "@/components/ipo/IPOEventCard";
import type { ComputedIPO } from "@/types/ipo";

interface TodayIPOCalendarProps {
  ipos: ComputedIPO[];
}

function isToday(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return differenceInCalendarDays(startOfDay(parseISO(value)), startOfDay(new Date())) === 0;
}

function isOpenToday(ipo: ComputedIPO) {
  const today = format(new Date(), "yyyy-MM-dd");

  return Boolean(ipo.open_date && ipo.close_date && ipo.open_date <= today && ipo.close_date >= today);
}

function closeLabel(closeDate: string | null) {
  if (!closeDate) {
    return "close date TBA";
  }

  const days = differenceInCalendarDays(startOfDay(parseISO(closeDate)), startOfDay(new Date()));

  if (days === 0) {
    return "closes today";
  }

  if (days === 1) {
    return "closes tomorrow";
  }

  if (days > 1) {
    return `closes in ${days} days`;
  }

  return "closed";
}

function listingGain(ipo: ComputedIPO) {
  const gain = ipo.listing_performance?.listing_gain_pct;

  return gain === null || gain === undefined ? null : gain;
}

export default function TodayIPOCalendar({ ipos }: TodayIPOCalendarProps) {
  const openIPOs = ipos.filter(isOpenToday);
  const allotments = ipos.filter((ipo) => isToday(ipo.allotment_date));
  const listings = ipos.filter((ipo) => isToday(ipo.listing_date));

  return (
    <section className="section today-ipo-section" aria-labelledby="today-ipo-calendar">
      <div className="shell">
        <div className="section-head compact">
          <div>
            <h2 id="today-ipo-calendar">Today&apos;s IPO Calendar</h2>
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
              href: `/ipo/${ipo.slug}`,
              meta: <span className="mono">{closeLabel(ipo.close_date)}</span>,
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
              href: `/ipo/${ipo.slug}`,
              meta: ipo.registrar_name ?? "Registrar NA",
              title: ipo.name,
            }))}
            title="Allotment Today"
          />
          <IPOEventCard
            accent="navy"
            count={listings.length}
            ctaHref="/performance"
            ctaLabel="View listing performance"
            description="IPOs debuting on exchange"
            emptyText="No listings today"
            icon={<Building2 size={18} />}
            rows={listings.map((ipo) => {
              const gain = listingGain(ipo);

              return {
                badge: gain === null ? { label: "Listing", tone: "blue" as const } : undefined,
                href: `/ipo/${ipo.slug}`,
                meta: (
                  <>
                    <span className="mono">₹{ipo.price_band_high ?? "NA"}</span> · {ipo.exchange ?? "Exchange NA"}
                  </>
                ),
                right:
                  gain === null ? undefined : (
                    <span className={`mono ${gain >= 0 ? "data-positive" : "data-negative"}`} style={{ fontSize: 12, fontWeight: 900 }}>
                      {gain >= 0 ? "+" : ""}
                      {gain.toFixed(1)}%
                    </span>
                  ),
                title: ipo.name,
              };
            })}
            title="Listing Today"
          />
        </div>
      </div>
    </section>
  );
}
