import type { Metadata } from "next";
import IPOCalendar from "@/components/IPOCalendar";
import { getComputedIPOs } from "@/lib/ipoData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "IPO Calendar 2026: Listing, Open & Close Dates - IPO Lens",
  description: "Track all upcoming, active, and listed Indian IPO dates. View IPO launch, subscription closing, allotment, and listing dates in one interactive calendar view.",
};

export default async function CalendarPage() {
  const ipos = await getComputedIPOs();

  return (
    <main className="premium-page-container calendar-page">
      <IPOCalendar ipos={ipos} />
    </main>
  );
}
