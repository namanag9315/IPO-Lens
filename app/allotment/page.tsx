import AllotmentCheckForm from "@/components/allotment/AllotmentCheckForm";
import AllotmentPrivacyNotice from "@/components/allotment/AllotmentPrivacyNotice";
import RecentAllotments from "@/components/allotment/RecentAllotments";
import { getAllotmentIPOOptions } from "@/lib/allotment/allotmentService";

interface AllotmentPageProps {
  searchParams?: {
    ipo?: string;
  };
}

export const dynamic = "force-dynamic";

export default async function AllotmentPage({ searchParams }: AllotmentPageProps) {
  const ipos = await getAllotmentIPOOptions();

  return (
    <main className="allotment-page">
      <section className="allotment-hero">
        <div className="shell">
          <div className="allotment-hero-copy">
            <span className="premium-pill">
              <span />
              Secure utility · official fallback links · no PAN storage in manual mode
            </span>
            <h1>IPO Allotment Checker</h1>
            <p>
              Check IPO allotment status using PAN or application number. IPO Lens does not save your PAN unless you explicitly choose to save it.
            </p>
          </div>
          <AllotmentPrivacyNotice />
        </div>
      </section>

      <section className="section">
        <div className="shell">
          {ipos.length > 0 ? (
            <AllotmentCheckForm initialSlug={searchParams?.ipo} ipos={ipos} />
          ) : (
            <div className="premium-card allotment-empty-state">
              <h3>No allotment-ready IPOs found</h3>
              <p>Closed or listed IPOs with allotment relevance will appear here once data is available.</p>
            </div>
          )}
        </div>
      </section>

      <section className="section allotment-recent-section">
        <div className="shell allotment-bottom-grid">
          <RecentAllotments ipos={ipos} />
          <div className="premium-card allotment-disclaimer">
            <span className="allotment-card-label">Disclaimer</span>
            <p>
              IPO Lens is for educational and informational purposes only. Allotment probability is an estimate based on subscription data. Final
              allotment depends on valid applications, cancellations, category-wise demand and basis of allotment. IPO Lens does not guarantee
              allotment.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
