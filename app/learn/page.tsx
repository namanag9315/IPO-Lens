import type { Metadata } from "next";
import AllotmentExplainer from "@/components/learn/AllotmentExplainer";
import ApplyFramework from "@/components/learn/ApplyFramework";
import IPOChecklist from "@/components/learn/IPOChecklist";
import IPOJourneyMap, { WhatIsIPOSection } from "@/components/learn/IPOJourneyMap";
import KeyTermsGrid from "@/components/learn/KeyTermsGrid";
import LearnCTA from "@/components/learn/LearnCTA";
import LearnHero from "@/components/learn/LearnHero";
import LearnProgress from "@/components/learn/LearnProgress";
import LearnQuiz from "@/components/learn/LearnQuiz";
import MainboardVsSME from "@/components/learn/MainboardVsSME";
import RiskCards from "@/components/learn/RiskCards";

export const metadata: Metadata = {
  title: "Learn IPO Investing Step by Step | IPO Lens",
  description: "A beginner-friendly IPO investing guide for Indian retail investors, explained with visual guides and risk warnings.",
};

export default function LearnPage() {
  return (
    <main className="learn-page">
      <LearnHero />
      <LearnProgress />
      <WhatIsIPOSection />
      <IPOJourneyMap />
      <AllotmentExplainer />
      <KeyTermsGrid />
      <IPOChecklist />
      <MainboardVsSME />
      <RiskCards />
      <ApplyFramework />
      <LearnQuiz />
      <LearnCTA />
      <section className="learn-disclaimer">
        <div className="shell">
          <p>
            IPO Lens is for educational and informational purposes only. We do not provide investment advice or IPO
            recommendations. IPO investments are subject to market risks. GMP is unofficial and not guaranteed. Please
            read the DRHP/RHP before investing.
          </p>
        </div>
      </section>
    </main>
  );
}
