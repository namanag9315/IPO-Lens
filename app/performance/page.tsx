import type { Metadata } from "next";
import ScoreAccuracyDashboard from "@/components/ipo/ScoreAccuracyDashboard";
import { getListingPerformanceDashboardRows } from "@/lib/services/listingPerformance";

export const metadata: Metadata = {
  title: "Score Accuracy Dashboard & IPO Listing Gains - IPO Lens",
  description:
    "Track recent IPO listing gains and compare IPO Lens scores against actual post-listing market outcomes.",
};

export default async function PerformancePage() {
  const rows = await getListingPerformanceDashboardRows();

  return <ScoreAccuracyDashboard rows={rows} />;
}
