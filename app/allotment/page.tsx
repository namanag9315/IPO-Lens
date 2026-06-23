import type { Metadata } from "next";
import AllotmentCheckForm from "@/components/allotment/AllotmentCheckForm";
import AllotmentPrivacyNotice from "@/components/allotment/AllotmentPrivacyNotice";
import RecentAllotments from "@/components/allotment/RecentAllotments";
import { getAllotmentEligibleIPOs } from "@/lib/allotment/data";

export const metadata: Metadata = {
  title: "IPO Allotment Status Checker - IPO Lens",
  description: "Check your IPO allotment status online. Instant checks for all recent Indian IPOs using PAN or application number.",
};

export default async function AllotmentPage({ searchParams }: { searchParams: { ipo?: string } }) {
  const ipos = await getAllotmentEligibleIPOs();

  return (
    <main className="shell" style={{ padding: "48px 0", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 48, alignItems: "start" }}>
        
        {/* Main Content */}
        <div>
          <h1 style={{ color: "var(--ink)", fontSize: 36, fontWeight: 900, letterSpacing: "-0.04em", margin: "0 0 8px" }}>
            IPO Allotment Checker
          </h1>
          <p style={{ color: "var(--text)", fontSize: 16, lineHeight: 1.5, margin: "0 0 32px" }}>
            Check IPO allotment status using PAN or application number. IPO Lens does not save your PAN in this version.
          </p>

          <AllotmentPrivacyNotice />

          <div style={{ marginTop: 32, background: "#fff", padding: 32, borderRadius: 16, border: "1px solid var(--border-default)", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }}>
            <h2 style={{ color: "var(--ink)", fontSize: 20, fontWeight: 900, marginBottom: 24, letterSpacing: "-0.02em" }}>
              Check Status
            </h2>
            <AllotmentCheckForm ipos={ipos} initialIpoSlug={searchParams.ipo} />
          </div>
        </div>

        {/* Sidebar */}
        <aside>
          <RecentAllotments ipos={ipos as any} />
        </aside>

      </div>
    </main>
  );
}
