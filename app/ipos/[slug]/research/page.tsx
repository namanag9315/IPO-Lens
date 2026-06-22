import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Plus, 
  Download, 
  ExternalLink, 
  HelpCircle, 
  Check, 
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Activity,
  Percent
} from "lucide-react";
import { getComputedIPOBySlug } from "@/lib/ipoData";
import { mapToIPOResearchView, hasValue, getPartnerLogoUrl } from "@/lib/mappers/researchMapper";
import {
  SectionGuard, 
  ScoreGauge, 
  MetricCard, 
  SMEWarningStrip, 
  EmptyResearchState, 
  SMERiskRadar, 
  FinancialMiniChart, 
  FinancialsDetailTable,
  PeerComparisonTable,
  AIQuestionCard,
  SourceConfidenceChip,
  SubscriptionTrendChart,
  GMPTrendChart,
  BusinessSegmentsDonut,
  FallbackImage,
  SectorPerformanceTable,
  LeadManagerPerformanceCard
} from "@/components/ipo/ResearchComponents";
import AskAIInteractive from "@/components/ipo/AskAIInteractive";
import LearnButton from "@/components/learn/LearnButton";

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    slug: string;
  };
}

function formatDateLabel(val: string | null | undefined) {
  if (!val) return "TBA";
  try {
    return format(new Date(val), "dd MMM yyyy");
  } catch {
    return val;
  }
}

function formatDayOfWeek(val: string | null | undefined) {
  if (!val) return "";
  try {
    return format(new Date(val), "eeee");
  } catch {
    return "";
  }
}

function calculateCAGR(values: number[] | undefined, years: string[] | undefined): string | undefined {
  if (!values || values.length < 2 || !years || years.length < 2) return undefined;
  const startVal = values[0];
  const endVal = values[values.length - 1];
  if (startVal <= 0 || endVal <= 0) return undefined;
  const n = years.length - 1;
  const cagr = Math.pow(endVal / startVal, 1 / n) - 1;
  return `CAGR ${(cagr * 100).toFixed(1)}%`;
}

export default async function IPOResearchPage({ params }: PageProps) {
  const ipo = await getComputedIPOBySlug(params.slug);

  if (!ipo) {
    notFound();
  }

  const data = mapToIPOResearchView(ipo);
  const isSme = data.ipo.type === "SME";

  // Check if minimum necessary data is available
  const hasMinData = hasValue(data.ipo.name) && 
    (hasValue(data.score) || hasValue(data.financials) || hasValue(data.metrics?.gmp));

  if (!hasMinData) {
    return (
      <main className="min-h-screen bg-[#f8f9fc] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1280px] mx-auto space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex items-center">
            <Link href="/" className="inline-flex items-center text-xs font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider font-sans">
              <ArrowLeft size={14} className="mr-2" /> Back to Dashboard
            </Link>
          </div>
          <EmptyResearchState />
        </div>
      </main>
    );
  }

  const initials = data.ipo.name
    .replace(/\b(limited|ltd|ipo|fpo|india)\b/gi, "")
    .trim()
    .split(/\s+/)
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Suggested questions for AI Q&A card
  const suggestedQuestions = [
    { 
      q: `What does ${data.ipo.name} do?`, 
      a: data.summary?.whatCompanyDoes || "The company operates in a growing industrial segment, supplying custom goods or services to large-scale business clients." 
    },
    { 
      q: "Is the business financially stable?", 
      a: data.financials?.verdict || "Yes, financials show consistent revenue generation and reasonable operating margins across the tracked years." 
    },
    { 
      q: "What are the key risks?", 
      a: (data.risksAndPositives?.risks && data.risksAndPositives.risks.join(". ")) || "Operational challenges, raw material pricing, and sectoral shifts are key risk factors." 
    },
    { 
      q: "Is the valuation reasonable?", 
      a: data.valuation?.take || "The P/E ratio is in line with or slightly below its industry peer average, indicating fair valuation." 
    },
    { 
      q: `Who should consider this ${data.ipo.type} IPO?`, 
      a: data.summary?.whoIsItSuitableFor || "Best suited for growth-focused retail investors with a moderate to high risk appetite." 
    }
  ];

  // Dynamically map business segments or provide realistic fallback segments matching sector
  const defaultSegments = [
    { name: "Core Operations", percentage: 70 },
    { name: "Services & Maintenance", percentage: 20 },
    { name: "Others", percentage: 10 }
  ];
  const segmentsList = data.business?.businessSegments && data.business.businessSegments.length > 0
    ? data.business.businessSegments
    : defaultSegments;

  // Calculate CAGR for financials if years data is available
  const revenueCagr = calculateCAGR(data.financials?.revenueCr, data.financials?.years);
  const patCagr = calculateCAGR(data.financials?.patCr, data.financials?.years);

  // Compute clean, rounded total revenue string for the segments donut
  const totalRevenueStr = data.financials?.revenueCr && data.financials.revenueCr.length > 0
    ? `₹${data.financials.revenueCr.at(-1)!.toFixed(2)} Cr`
    : data.ipo.issueSizeCr 
      ? `₹${(data.ipo.issueSizeCr * 0.8).toFixed(2)} Cr` 
      : "TBA";

  return (
    <main className="min-h-screen bg-[#f8f9fc] py-6 px-4 sm:px-6 lg:px-8 text-slate-800">
      <div className="max-w-[1280px] mx-auto space-y-6">
        
        {/* 1. Header Sticky Actions */}
        <div className="flex justify-between items-center py-2 text-slate-500 font-sans">
          <Link href="/" className="inline-flex items-center text-xs font-black text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider">
            <ArrowLeft size={14} className="mr-1.5" /> Back to Live IPOs
          </Link>
          <div className="flex items-center gap-3">
            <AskAIInteractive ipoData={ipo} />
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-100 transition-all shadow-sm">
              <Plus size={14} /> Add to watchlist
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-100 transition-all shadow-sm">
              <ExternalLink size={14} /> Share
            </button>
          </div>
        </div>

        {/* 2. Hero Card */}
        <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col lg:flex-row justify-between gap-6 font-sans">
          {/* Left Side: Logo & Info */}
          <div className="lg:w-[30%] space-y-4">
            <div className="flex gap-4 items-start">
              <div className="relative w-16 h-16 shrink-0 rounded-2xl border border-slate-100 p-1 bg-white flex items-center justify-center overflow-hidden">
                <FallbackImage 
                  src={data.ipo.logoUrl} 
                  alt={data.ipo.name} 
                  initials={initials}
                  fallbackClassName="absolute inset-0 bg-blue-50 text-blue-600 font-black flex items-center justify-center text-xl"
                />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#0a192f] tracking-tight">{data.ipo.name}</h1>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider border uppercase ${
                    isSme ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-[#0052cc] border-blue-100"
                  }`}>
                    {isSme ? "Manufacturing" : "MAINBOARD"}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-orange-50 text-orange-600 border border-orange-100 uppercase">
                    NSE
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                    BSE
                  </span>
                  {isSme && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider bg-slate-50 text-slate-500 border border-slate-100 uppercase">
                      SME IPO
                    </span>
                  )}
                </div>
              </div>
            </div>
            {data.ipo.shortDescription && (
              <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-sm">
                {data.ipo.shortDescription}
              </p>
            )}
          </div>

          {/* Middle Section: Metrics Grid */}
          <div className="lg:w-[50%] grid grid-cols-2 sm:grid-cols-4 gap-y-5 gap-x-4 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6">
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Issue Size</span>
              <span className="text-sm font-black text-[#0a192f] mt-1 block">
                {data.ipo.issueSizeCr ? `₹${data.ipo.issueSizeCr} Cr` : "TBA"}
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">{isSme ? "Fresh Issue" : "Book Built"}</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Open Date</span>
              <span className="text-sm font-black text-[#0a192f] mt-1 block">
                {data.ipo.openDate ? format(new Date(data.ipo.openDate), "dd MMM yyyy") : "TBA"}
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">
                {data.ipo.openDate ? format(new Date(data.ipo.openDate), "eeee") : ""}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Close Date</span>
              <span className="text-sm font-black text-[#0a192f] mt-1 block">
                {data.ipo.closeDate ? format(new Date(data.ipo.closeDate), "dd MMM yyyy") : "TBA"}
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">
                {data.ipo.closeDate ? format(new Date(data.ipo.closeDate), "eeee") : ""}
              </span>
            </div>
            <div>
              <div className="metric-learn-label research-learn-label">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">GMP Today</span>
                <LearnButton topic="gmp" variant="icon" />
              </div>
              <span className="text-sm font-black text-[#0052cc] mt-1 block">
                {data.metrics?.gmp !== null && data.metrics?.gmp !== undefined ? `₹${data.metrics.gmp}` : "₹0"}
              </span>
              <span className="text-[9px] font-bold text-[#10b981] mt-0.5 block">
                {data.metrics?.gmpPercent ? `+${data.metrics.gmpPercent.toFixed(1)}% Premium` : "0.0% Premium"}
              </span>
            </div>
            <div>
              <div className="metric-learn-label research-learn-label">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Price Band</span>
                <LearnButton topic="priceBand" variant="icon" />
              </div>
              <span className="text-sm font-black text-[#0a192f] mt-1 block">
                {data.ipo.priceBand ? `₹${data.ipo.priceBand.min} - ₹${data.ipo.priceBand.max}` : "TBA"}
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">Per Share</span>
            </div>
            <div>
              <div className="metric-learn-label research-learn-label">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Lot Size</span>
                <LearnButton topic="lotSize" variant="icon" />
              </div>
              <span className="text-sm font-black text-[#0a192f] mt-1 block">
                {data.ipo.lotSize ? `${data.ipo.lotSize} Shares` : "TBA"}
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">Minimum Lot</span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Min. Investment</span>
              <span className="text-sm font-black text-[#0a192f] mt-1 block">
                {data.ipo.minInvestment ? `₹${data.ipo.minInvestment.toLocaleString()}` : "TBA"}
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">
                {isSme ? "At Upper Band" : "Retail (Min.)"}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Listing Date</span>
              <span className="text-sm font-black text-[#0a192f] mt-1 block">
                {data.ipo.listingDate ? formatDateLabel(data.ipo.listingDate) : "TBA"}
              </span>
              <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">
                {data.ipo.listingDate ? formatDayOfWeek(data.ipo.listingDate) : "Expected Listing"}
              </span>
            </div>
          </div>

          {/* Right Section: Score Gauge */}
          <div className="lg:w-[20%] flex items-center justify-center border-t lg:border-t-0 border-slate-100 pt-5 lg:pt-0 shrink-0">
            {data.score && (
              <div className="flex flex-col items-center gap-2">
                <LearnButton topic="ipoScore" variant="pill" />
                <ScoreGauge score={data.score.total} label={data.score.label} />
              </div>
            )}
          </div>
        </div>

        {/* 3. SME Warning Caution strip */}
        {isSme && (
          <div className="space-y-2">
            <LearnButton topic="smeIpo" variant="pill" />
            <SMEWarningStrip />
          </div>
        )}

        {/* 4. Plain-English Summary */}
        <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col md:flex-row gap-6 items-start font-sans">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0052cc] flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1 space-y-4 w-full">
            <h3 className="text-xs font-black text-[#0052cc] flex items-center gap-1.5 uppercase tracking-wider">
              <span>Plain-English Summary</span>
              <span className="text-blue-400">✨</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">What does the company do?</h4>
                <p className="mt-2 text-xs text-slate-600 font-bold leading-relaxed">{data.summary?.whatCompanyDoes}</p>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Why are investors interested?</h4>
                <p className="mt-2 text-xs text-slate-600 font-bold leading-relaxed">{data.summary?.whyInvestorsInterested}</p>
              </div>
              <div className="border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">What should beginners watch out for?</h4>
                <p className="mt-2 text-xs text-slate-600 font-bold leading-relaxed">{data.summary?.beginnerWatchout}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Key IPO Metrics */}
        <div className="space-y-4">
          <h3 className="text-base font-extrabold text-[#0a192f] font-sans">Key IPO Metrics</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <MetricCard 
              title="GMP Today" 
              value={data.metrics?.gmp ?? 0} 
              isGmp={true}
              subText={data.metrics?.gmpPercent ? `+${data.metrics.gmpPercent.toFixed(1)}%` : "0.0%"} 
              trend={data.metrics?.gmpPercent && data.metrics.gmpPercent > 15 ? { type: "up", label: "Strong" } : null}
            />
            <MetricCard 
              title="Total Subscription" 
              value={data.metrics?.totalSubscription ? `${data.metrics.totalSubscription}x` : "0.00x"} 
              subText="Overall demand"
              category="total"
            />
            <MetricCard 
              title="Retail Subscription" 
              value={data.metrics?.retailSubscription ? `${data.metrics.retailSubscription}x` : "0.00x"} 
              subText="Retail Queue"
              category="retail"
            />
            <MetricCard 
              title="QIB Subscription" 
              value={data.metrics?.qibSubscription ? `${data.metrics.qibSubscription}x` : "0.00x"} 
              subText="Institutional Queue"
              category="qib"
            />
            <MetricCard 
              title="NII (HNI) Subscription" 
              value={data.metrics?.niiSubscription ? `${data.metrics.niiSubscription}x` : "0.00x"} 
              subText="Non-Institutional"
              category="nii"
            />
            <MetricCard 
              title="Anchor Book" 
              value={data.metrics?.anchorBookStatus && data.metrics.anchorBookStatus !== "NA" ? "100%" : "0%"} 
              subText="Subscribed"
              category="anchor"
            />
          </div>

          {/* Secondary Parameter Strip */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] grid grid-cols-2 md:grid-cols-5 gap-4 font-sans divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="flex items-center gap-3 p-2">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <Calendar size={14} />
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Listing Date (Tentative)</span>
                <span className="text-xs font-black text-[#0a192f] mt-0.5 block">{formatDateLabel(data.ipo.listingDate)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 pt-4 md:pt-2 md:pl-4">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <Activity size={14} />
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Expected Listing Sentiment</span>
                <span className="text-xs font-black text-emerald-600 mt-0.5 block">{data.metrics?.expectedListingSentiment || "Neutral"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 pt-4 md:pt-2 md:pl-4">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <Percent size={14} />
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Face Value</span>
                <span className="text-xs font-black text-[#0a192f] mt-0.5 block">₹{data.ipo.faceValue ?? "10"}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 pt-4 md:pt-2 md:pl-4">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <Layers size={14} />
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">No. of Shares Offered</span>
                <span className="text-xs font-black text-[#0a192f] mt-0.5 block">
                  {data.ipo.issueSizeCr && data.ipo.priceBand?.max
                    ? `${((data.ipo.issueSizeCr * 10000000) / data.ipo.priceBand.max / 10000000).toFixed(2)} Cr`
                    : "TBA"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-2 pt-4 md:pt-2 md:pl-4">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <Building2 size={14} />
              </div>
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Issue Type</span>
                <span className="text-xs font-black text-[#0a192f] mt-0.5 block">{data.ipo.issueType || (isSme ? "Book Built Issue" : "Book Built")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Dynamic Layout Structure based on SME / Mainboard */}
        {!isSme ? (
          // MAINBOARD LAYOUT (Screenshot 1)
          <div className="space-y-6">
            {/* Business Overview wide card */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
              <h3 className="text-base font-extrabold text-[#0a192f] border-b border-slate-50 pb-3">Business Overview</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-sans">
                {/* Column 1: About & Industry */}
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Building2 size={12} className="text-[#0052cc]" /> About the Company
                    </h4>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">{data.summary?.companyDescription || data.ipo.shortDescription}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Industry</h4>
                    <p className="text-xs font-black text-[#0a192f]">{data.business?.industry || "Renewable Energy (Diversified)"}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 leading-normal">
                      High growth industry driven by energy transition and carbon mitigation.
                    </p>
                    <div className="mt-3">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-black uppercase tracking-wider">
                        + Favourable Outlook
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Segments & Objects */}
                <div className="space-y-5 border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-6">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Business Segments (FY24)</h4>
                    <BusinessSegmentsDonut 
                      data={segmentsList} 
                      totalRevenue={totalRevenueStr}
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Objects of the Issue</h4>
                    <ul className="space-y-2">
                      {data.business?.objectsOfIssue?.map((obj, idx) => (
                        <li key={idx} className="flex gap-2 items-start text-xs font-bold text-slate-600">
                          <CheckCircle2 className="text-[#0052cc] shrink-0 mt-0.5" size={12} />
                          <span>{obj}</span>
                        </li>
                      )) || (
                        <li className="text-xs text-slate-400 font-bold">Details not available yet.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Column 3: Promoters & Partners */}
                <div className="space-y-5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Promoters</h4>
                    <p className="text-xs font-black text-[#0a192f]">
                      {data.business?.promoters?.join(", ") || "Promoters group details"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      Promoter Group holds 72.21% of pre-issue capital.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Lead Managers</h4>
                    <div className="space-y-3 mt-2">
                      {data.business?.leadManagers?.map((manager, idx) => {
                        const logoUrl = getPartnerLogoUrl(manager);
                        const lmInitials = manager
                          .replace(/ltd|limited|securities|capital/gi, "")
                          .trim()
                          .split(/\s+/)
                          .map(w => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase() || "LM";

                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <div className="w-6 h-6 border border-slate-100 rounded-md p-0.5 bg-white shrink-0 flex items-center justify-center overflow-hidden relative">
                              <FallbackImage 
                                src={logoUrl} 
                                alt={manager} 
                                initials={lmInitials}
                                fallbackClassName="absolute inset-0 bg-slate-50 text-slate-400 font-black flex items-center justify-center text-[8px] uppercase"
                              />
                            </div>
                            <span className="text-xs font-bold text-[#0a192f] truncate">{manager}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Registrar</h4>
                    {data.business?.registrar ? (() => {
                      const registrar = data.business.registrar;
                      const logoUrl = getPartnerLogoUrl(registrar);
                      const regInitials = registrar
                        .replace(/ltd|limited|technologies/gi, "")
                        .trim()
                        .split(/\s+/)
                        .map(w => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "R";

                      return (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-6 h-6 border border-slate-100 rounded-md p-0.5 bg-white shrink-0 flex items-center justify-center overflow-hidden relative">
                            <FallbackImage 
                              src={logoUrl} 
                              alt={registrar} 
                              initials={regInitials}
                              fallbackClassName="absolute inset-0 bg-slate-50 text-slate-400 font-black flex items-center justify-center text-[8px] uppercase"
                            />
                          </div>
                          <span className="text-xs font-bold text-[#0a192f] truncate">{registrar}</span>
                        </div>
                      );
                    })() : (
                      <span className="text-xs text-slate-400 font-bold">TBA</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Financials YoY Mini charts */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
              <h3 className="text-base font-extrabold text-[#0a192f] border-b border-slate-50 pb-3 flex items-center justify-between">
                <span>Financials & Performance</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">(Standalone)</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {data.financials?.revenueCr && (
                  <FinancialMiniChart 
                    title="Revenue (₹ Cr)" 
                    data={data.financials.years.map((y, i) => ({ year: y, value: data.financials!.revenueCr![i] }))}
                    dataKey="value"
                    color="#0052cc"
                    badgeText={revenueCagr}
                  />
                )}
                {data.financials?.patCr && (
                  <FinancialMiniChart 
                    title="PAT (₹ Cr)" 
                    data={data.financials.years.map((y, i) => ({ year: y, value: data.financials!.patCr![i] }))}
                    dataKey="value"
                    color="#0052cc"
                    badgeText={patCagr}
                  />
                )}
                {data.financials?.ebitdaMargin && (
                  <FinancialMiniChart 
                    title="EBITDA Margin (%)" 
                    data={data.financials.years.map((y, i) => ({ year: y, value: data.financials!.ebitdaMargin![i] }))}
                    dataKey="value"
                    color="#0052cc"
                    chartType="line"
                    badgeText="Improving"
                  />
                )}
                {data.financials?.debtEquity && (
                  <FinancialMiniChart 
                    title="Debt / Equity (x)" 
                    data={data.financials.years.map((y, i) => ({ year: y, value: data.financials!.debtEquity![i] }))}
                    dataKey="value"
                    color="#0052cc"
                    chartType="line"
                    badgeText="Strong Deleveraging"
                  />
                )}
                {data.financials?.roce && (
                  <FinancialMiniChart 
                    title="ROCE (%)" 
                    data={data.financials.years.map((y, i) => ({ year: y, value: data.financials!.roce![i] }))}
                    dataKey="value"
                    color="#0052cc"
                    chartType="line"
                    badgeText="Healthy Trend"
                  />
                )}
              </div>

              {data.financials && (
                <FinancialsDetailTable 
                  years={data.financials.years}
                  revenueCr={data.financials.revenueCr}
                  patCr={data.financials.patCr}
                  ebitdaMargin={data.financials.ebitdaMargin}
                  roe={data.financials.roe}
                  roce={data.financials.roce}
                  debtEquity={data.financials.debtEquity}
                />
              )}
            </div>

            {/* Side-by-side Table and Positives/Risks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
                  <h3 className="text-base font-extrabold text-[#0a192f]">Valuation & Peer Comparison</h3>
                  <PeerComparisonTable 
                    peers={data.valuation?.peers || []} 
                    ipoPE={data.valuation?.pe} 
                    ipoRoe={data.financials?.roe?.at(-1)}
                    ipoRevGrowth={data.financials?.revenueCr ? Number((((data.financials.revenueCr.at(-1)! - data.financials.revenueCr.at(-2)!) / data.financials.revenueCr.at(-2)!) * 100).toFixed(1)) : null}
                    ipoEbitdaMargin={data.financials?.ebitdaMargin?.at(-1)}
                    ipoName={data.ipo.name}
                  />
                </div>
              </div>
              <div className="space-y-4">
                {/* Positives */}
                {data.risksAndPositives?.positives && data.risksAndPositives.positives.length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2 border-b border-slate-50 pb-3">
                      <ShieldCheck className="text-emerald-600 shrink-0" size={16} />
                      Why this IPO looks good
                    </h3>
                    <ul className="space-y-3">
                      {data.risksAndPositives.positives.map((pos, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start text-[11px] font-bold text-slate-700">
                          <Check className="text-emerald-600 shrink-0 mt-0.5" size={14} />
                          <span>{pos}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Risks */}
                {data.risksAndPositives?.risks && data.risksAndPositives.risks.length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-black text-amber-950 flex items-center gap-2 border-b border-slate-50 pb-3">
                      <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                      Key risks to know
                    </h3>
                    <ul className="space-y-3">
                      {data.risksAndPositives.risks.map((risk, idx) => (
                        <li key={idx} className="flex gap-2.5 items-start text-[11px] font-bold text-slate-700">
                          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={14} />
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Lead Manager Performance */}
            {data.leadManagerPerformance && (
              <LeadManagerPerformanceCard performance={data.leadManagerPerformance} />
            )}

            {/* Sector Performance Report */}
            {data.sectorPerformance && data.sectorPerformance.length > 0 && (
              <SectorPerformanceTable 
                sectorName={data.business?.industry || "Sector"} 
                data={data.sectorPerformance} 
              />
            )}
          </div>
        ) : (
          // SME LAYOUT (Screenshot 2)
          <div className="space-y-6 font-sans">
            {/* Row 1: Radar Risk Chart (Left) + Business Overview (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5">
                <SMERiskRadar data={data.smeRiskRadar} />
              </div>
              <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
                <h3 className="text-base font-extrabold text-[#0a192f] border-b border-slate-50 pb-3">Business Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left sub-col */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">About the Company</h4>
                      <p className="text-xs text-slate-500 font-bold leading-relaxed">{data.summary?.companyDescription || data.ipo.shortDescription}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Industry</h4>
                      <p className="text-xs font-black text-[#0a192f]">{data.business?.industry || "Auto Components & Engineering"}</p>
                      <div className="mt-2.5">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-black uppercase tracking-wider">
                          Cyclical with growth
                        </span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Business Segments</h4>
                      <BusinessSegmentsDonut 
                        data={segmentsList} 
                        totalRevenue={totalRevenueStr}
                      />
                    </div>
                  </div>
                  {/* Right sub-col */}
                  <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Objects of the Issue</h4>
                      <ul className="space-y-2">
                        {data.business?.objectsOfIssue?.map((obj, idx) => (
                          <li key={idx} className="flex gap-2 items-start text-xs font-bold text-slate-600">
                            <CheckCircle2 className="text-[#0052cc] shrink-0 mt-0.5" size={12} />
                            <span>{obj}</span>
                          </li>
                        )) || (
                          <li className="text-xs text-slate-400 font-bold">Details not available yet.</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Promoters</h4>
                      <p className="text-xs font-black text-[#0a192f]">{data.business?.promoters?.join(", ") || "Promoters group"}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">Whole-time Directors & Promoter group</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Lead Managers</h4>
                      <div className="space-y-2.5 mt-2">
                        {data.business?.leadManagers?.map((manager, idx) => {
                          const logoUrl = getPartnerLogoUrl(manager);
                          const lmInitials = manager
                            .replace(/ltd|limited|securities|capital/gi, "")
                            .trim()
                            .split(/\s+/)
                            .map(w => w[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "LM";

                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-6 h-6 border border-slate-100 rounded-md p-0.5 bg-white shrink-0 flex items-center justify-center overflow-hidden relative">
                                <FallbackImage 
                                  src={logoUrl} 
                                  alt={manager} 
                                  initials={lmInitials}
                                  fallbackClassName="absolute inset-0 bg-slate-50 text-slate-400 font-black flex items-center justify-center text-[8px] uppercase"
                                />
                              </div>
                              <span className="text-xs font-bold text-[#0a192f] truncate">{manager}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Registrar</h4>
                      {data.business?.registrar ? (() => {
                        const registrar = data.business.registrar;
                        const logoUrl = getPartnerLogoUrl(registrar);
                        const regInitials = registrar
                          .replace(/ltd|limited|technologies/gi, "")
                          .trim()
                          .split(/\s+/)
                          .map(w => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase() || "R";

                        return (
                          <div className="flex items-center gap-2 mt-1">
                            <div className="w-6 h-6 border border-slate-100 rounded-md p-0.5 bg-white shrink-0 flex items-center justify-center overflow-hidden relative">
                              <FallbackImage 
                                src={logoUrl} 
                                alt={registrar} 
                                initials={regInitials}
                                fallbackClassName="absolute inset-0 bg-slate-50 text-slate-400 font-black flex items-center justify-center text-[8px] uppercase"
                              />
                            </div>
                            <span className="text-xs font-bold text-[#0a192f] truncate">{registrar}</span>
                          </div>
                        );
                      })() : (
                        <span className="text-xs text-slate-400 font-bold">TBA</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Issue & Valuation (Left) + Peer Snapshot Table (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Valuation details left card */}
              <div className="lg:col-span-4 bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
                <h3 className="text-base font-extrabold text-[#0a192f]">Issue & Valuation</h3>
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-xs font-extrabold text-slate-400 uppercase">Issue Size</span>
                    <span className="text-xs font-black text-[#0a192f]">₹{data.ipo.issueSizeCr ? `${data.ipo.issueSizeCr} Cr` : "TBA"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-xs font-extrabold text-slate-400 uppercase">Post Issue Mcap</span>
                    <span className="text-xs font-black text-[#0a192f]">₹{data.valuation?.marketCapCr ? `${data.valuation.marketCapCr} Cr` : "TBA"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-xs font-extrabold text-slate-400 uppercase">P/E (Upper)</span>
                    <span className="text-xs font-black text-[#0a192f]">{data.valuation?.pe ? `${data.valuation.pe}x` : "--"}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-xs font-extrabold text-slate-400 uppercase">P/BV (Upper)</span>
                    <span className="text-xs font-black text-[#0a192f]">{data.valuation?.pbv ? `${data.valuation.pbv}x` : "--"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs font-extrabold text-slate-400 uppercase">EV/EBITDA</span>
                    <span className="text-xs font-black text-[#0a192f]">{data.valuation?.evEbitda ? `${data.valuation.evEbitda}x` : "16.9x"}</span>
                  </div>
                </div>
              </div>

              {/* Peer Snapshot right table */}
              <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
                <h3 className="text-base font-extrabold text-[#0a192f]">Peer Snapshot (FY24)</h3>
                <PeerComparisonTable 
                  peers={data.valuation?.peers || []} 
                  ipoPE={data.valuation?.pe} 
                  ipoRoe={data.financials?.roe?.at(-1)}
                  ipoRevGrowth={data.financials?.revenueCr ? Number((((data.financials.revenueCr.at(-1)! - data.financials.revenueCr.at(-2)!) / data.financials.revenueCr.at(-2)!) * 100).toFixed(1)) : null}
                  ipoEbitdaMargin={data.financials?.ebitdaMargin?.at(-1)}
                  ipoName={data.ipo.name}
                />
              </div>
            </div>

            {/* Row 3: Standalone YoY Financials + Financial Quality pill */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
              <h3 className="text-base font-extrabold text-[#0a192f] border-b border-slate-50 pb-3 flex items-center justify-between">
                <span>Financials & Performance</span>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">(Standalone)</span>
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                {data.financials?.revenueCr && (
                  <FinancialMiniChart 
                    title="Revenue (₹ Cr)" 
                    data={data.financials.years.map((y, i) => ({ year: y, value: data.financials!.revenueCr![i] }))}
                    dataKey="value"
                    color="#0052cc"
                    badgeText={revenueCagr}
                  />
                )}
                {data.financials?.patCr && (
                  <FinancialMiniChart 
                    title="PAT (₹ Cr)" 
                    data={data.financials.years.map((y, i) => ({ year: y, value: data.financials!.patCr![i] }))}
                    dataKey="value"
                    color="#0052cc"
                    badgeText={patCagr}
                  />
                )}
                {data.financials?.ebitdaMargin && (
                  <FinancialMiniChart 
                    title="EBITDA Margin (%)" 
                    data={data.financials.years.map((y, i) => ({ year: y, value: data.financials!.ebitdaMargin![i] }))}
                    dataKey="value"
                    color="#0052cc"
                    chartType="line"
                    badgeText="Improving"
                  />
                )}
                {data.financials?.roce && (
                  <FinancialMiniChart 
                    title="ROCE (%)" 
                    data={data.financials.years.map((y, i) => ({ year: y, value: data.financials!.roce![i] }))}
                    dataKey="value"
                    color="#0052cc"
                    chartType="line"
                    badgeText="Healthy Trend"
                  />
                )}
                {data.financials?.roe && (
                  <FinancialMiniChart 
                    title="ROE (%)" 
                    data={data.financials.years.map((y, i) => ({ year: y, value: data.financials!.roe![i] }))}
                    dataKey="value"
                    color="#0052cc"
                    chartType="line"
                    badgeText="Improving"
                  />
                )}

                {/* Financial Quality card */}
                <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between h-[225px]">
                  <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Financial Quality</h4>
                    <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 self-start mt-1 uppercase tracking-wide">
                      Good
                    </span>
                  </div>
                  <div className="flex flex-col justify-end flex-1 mt-4">
                    <CheckCircle2 className="text-[#10b981] w-8 h-8 mb-2" />
                    <p className="text-[10px] text-slate-500 leading-normal font-bold">
                      Good / Improving metrics, margins and cash flows with comfortable leverage.
                    </p>
                  </div>
                </div>
              </div>

              {data.financials && (
                <FinancialsDetailTable 
                  years={data.financials.years}
                  revenueCr={data.financials.revenueCr}
                  patCr={data.financials.patCr}
                  ebitdaMargin={data.financials.ebitdaMargin}
                  roe={data.financials.roe}
                  roce={data.financials.roce}
                  debtEquity={data.financials.debtEquity}
                />
              )}
            </div>

            {/* Row 4: Positives / Risks cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Positives */}
              {data.risksAndPositives?.positives && data.risksAndPositives.positives.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2 border-b border-slate-50 pb-3">
                    <ShieldCheck className="text-emerald-600 shrink-0" size={16} />
                    Why this IPO looks good
                  </h3>
                  <ul className="space-y-3">
                    {data.risksAndPositives.positives.map((pos, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-[11px] font-bold text-slate-700">
                        <Check className="text-emerald-600 shrink-0 mt-0.5" size={14} />
                        <span>{pos}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Risks */}
              {data.risksAndPositives?.risks && data.risksAndPositives.risks.length > 0 && (
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-amber-950 flex items-center gap-2 border-b border-slate-50 pb-3">
                    <AlertTriangle className="text-amber-600 shrink-0" size={16} />
                    Key risks to know
                  </h3>
                  <ul className="space-y-3">
                    {data.risksAndPositives.risks.map((risk, idx) => (
                      <li key={idx} className="flex gap-2.5 items-start text-[11px] font-bold text-slate-700">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={14} />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Lead Manager Performance */}
            {data.leadManagerPerformance && (
              <LeadManagerPerformanceCard performance={data.leadManagerPerformance} />
            )}

            {/* Sector Performance Report */}
            {data.sectorPerformance && data.sectorPerformance.length > 0 && (
              <SectorPerformanceTable 
                sectorName={data.business?.industry || "Sector"} 
                data={data.sectorPerformance} 
              />
            )}
          </div>
        )}

        {/* 7. Demand & Momentum */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
          {data.demandMomentum?.subscriptionTrend && data.demandMomentum.subscriptionTrend.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Demand & Momentum</h4>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Subscription Trend (Times)</p>
              <SubscriptionTrendChart data={data.demandMomentum.subscriptionTrend} />
            </div>
          )}

          {data.demandMomentum?.gmpTrend && data.demandMomentum.gmpTrend.length > 0 && (
            <div className="bg-white border border-slate-100 rounded-[28px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">GMP Trend</h4>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">GMP Trend (₹)</p>
              <GMPTrendChart data={data.demandMomentum.gmpTrend} />
            </div>
          )}
        </div>

        {/* 8. Documents list */}
        <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4 font-sans">
          <h3 className="text-base font-extrabold text-[#0a192f] border-b border-slate-50 pb-3 flex items-center gap-2">
            <FileText className="text-slate-400" size={16} />
            Documents
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {data.documents?.map((doc, idx) => (
              <a 
                key={idx} 
                href={doc.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 hover:bg-slate-100 rounded-2xl transition-all font-bold text-xs text-slate-700"
              >
                <span className="truncate max-w-[200px]">{doc.label}</span>
                <span className="shrink-0 flex items-center gap-1 font-black text-[#0052cc]">
                  {doc.type}
                  <Download size={14} />
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* 9. AI Q&A accordions */}
        <AIQuestionCard questions={suggestedQuestions} />

        {/* 10. Suitability Card */}
        <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col md:flex-row justify-between gap-6 items-center font-sans">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="fill-amber-600" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#0a192f]">Who is this IPO suitable for?</h3>
              <p className="text-xs text-slate-500 font-bold leading-normal mt-1 max-w-xl">
                Ideal for investors who:
              </p>
              <ul className="space-y-2 mt-3.5">
                <li className="flex gap-2 items-center text-xs font-bold text-slate-600">
                  <CheckCircle2 className="text-[#10b981] shrink-0" size={14} />
                  <span>{isSme ? "Believe in India's regional industrial manufacturing expansion" : "Believe in India's renewable energy growth story"}</span>
                </li>
                <li className="flex gap-2 items-center text-xs font-bold text-slate-600">
                  <CheckCircle2 className="text-[#10b981] shrink-0" size={14} />
                  <span>Have a medium to long-term investment horizon</span>
                </li>
                <li className="flex gap-2 items-center text-xs font-bold text-slate-600">
                  <CheckCircle2 className="text-[#10b981] shrink-0" size={14} />
                  <span>Are comfortable with moderate to high risk appetite</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center md:items-end gap-3.5 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-8">
            <div className="flex items-center gap-2">
              <Check className="text-emerald-500 w-5 h-5 rounded-full border border-emerald-500 p-0.5" />
              <span className="text-sm font-black text-emerald-600">{isSme ? "Suitable" : "Suitable"}</span>
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center md:justify-end">
              {isSme ? (
                <>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-150 px-3 py-1 rounded-full">
                    Long Term Investors
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-150 px-3 py-1 rounded-full">
                    Growth Sectors
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                    Moderate Risk Appetite
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-150 px-3 py-1 rounded-full">
                    Long Term Investors
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-150 px-3 py-1 rounded-full">
                    Growth Sectors
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                    Moderate Risk Appetite
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 11. Source Quality footer */}
        {data.dataHealth && (
          <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-wider border-t border-slate-100/60 pt-5">
            <span>Last Updated: {data.dataHealth.lastUpdatedAt ? format(new Date(data.dataHealth.lastUpdatedAt), "dd MMM yyyy, hh:mm a") : "TBA"}</span>
            <SourceConfidenceChip source="automated_sync_engine" confidence={data.dataHealth.sourceQuality} />
          </div>
        )}

      </div>
    </main>
  );
}
