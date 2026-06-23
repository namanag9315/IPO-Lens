"use client";

import React, { useState } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Info, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Percent, 
  ShieldAlert, 
  DollarSign, 
  Activity, 
  Flame, 
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  ArrowRight
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { hasValue } from "@/lib/mappers/researchMapper";

// --- Section Guard ---
export function SectionGuard({ data, children }: { data: any; children: React.ReactNode }) {
  if (!hasValue(data)) return null;
  return <>{children}</>;
}

// --- Score Gauge (Semicircular with Pointer & Ticks) ---
export function ScoreGauge({ score, label }: { score: number; label: string }) {
  const getScoreColor = (val: number) => {
    if (val >= 75) return "#10b981"; // Emerald/Green
    if (val >= 55) return "#f59e0b"; // Amber/Orange
    return "#ef4444"; // Red
  };

  const getSentimentText = (val: number) => {
    if (val >= 75) return "Strong Research";
    if (val >= 55) return "Moderate Research";
    return "Weak Research";
  };

  const color = getScoreColor(score);
  const rotationAngle = -90 + (score / 100) * 180; // Maps 0-100 to -90 to +90 degrees

  // Generate tick marks coordinates for a 180-degree semicircle on top
  const ticks = Array.from({ length: 11 }).map((_, i) => {
    const angle = 180 - i * 18; // 180 (left) to 0 (right)
    const rad = (angle * Math.PI) / 180;
    const rStart = 38;
    const rEnd = 43;
    const x1 = 50 + rStart * Math.cos(rad);
    const y1 = 50 - rStart * Math.sin(rad);
    const x2 = 50 + rEnd * Math.cos(rad);
    const y2 = 50 - rEnd * Math.sin(rad);
    return { x1, y1, x2, y2 };
  });

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-3xl w-full max-w-[240px]">
      <div className="relative w-full max-w-[180px] aspect-[2/1] flex items-end justify-center">
        {/* Gauge Path */}
        <svg viewBox="0 0 100 50" className="w-full">
          {/* Ticks */}
          {ticks.map((tick, i) => (
            <line
              key={i}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="#e2e8f0"
              strokeWidth="1.2"
            />
          ))}
          {/* Background Grey Track */}
          <path
            d="M 15 50 A 35 35 0 0 1 85 50"
            fill="none"
            stroke="#f8fafc"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Colored Value Track */}
          <path
            d="M 15 50 A 35 35 0 0 1 85 50"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="109.96"
            strokeDashoffset={109.96 * (1 - score / 100)}
            style={{
              transition: "stroke-dashoffset 1.5s ease-in-out"
            }}
          />
          
          {/* Semicircle center pivot */}
          <circle cx="50" cy="50" r="4.5" fill="#0a192f" />
          <circle cx="50" cy="50" r="1.5" fill="#ffffff" />
          
          {/* Needle/Pointer */}
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="18"
            stroke="#0a192f"
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{
              transform: `rotate(${rotationAngle}deg)`,
              transformOrigin: "50px 50px",
              transition: "transform 1.5s cubic-bezier(0.19, 1, 0.22, 1)"
            }}
          />
        </svg>

        {/* Score Value text overlay */}
        <div className="absolute bottom-[-6px] flex flex-col items-center justify-center">
          <div className="flex items-baseline">
            <span className="text-3xl font-extrabold text-[#0a192f] leading-none">{score}</span>
            <span className="text-xs font-semibold text-slate-400 ml-0.5">/100</span>
          </div>
          <span 
            className="text-[10px] font-extrabold mt-1.5 uppercase tracking-wider"
            style={{ color }}
          >
            {getSentimentText(score)}
          </span>
        </div>
      </div>
      
      <p className="mt-3.5 text-[10px] text-slate-400 font-bold text-center leading-normal max-w-[170px] uppercase tracking-wide">
        {score >= 75 ? "High quality fundamentals with reasonable valuation" : 
         score >= 55 ? "Moderate fundamentals with elevated risk parameters" :
         "Weak fundamentals and premium/expensive valuation"}
      </p>
    </div>
  );
}

// --- Source Confidence Chip ---
export function SourceConfidenceChip({ source, confidence }: { source?: string; confidence?: "HIGH" | "MEDIUM" | "LOW" }) {
  const getConfStyles = (conf?: string) => {
    if (conf === "HIGH") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (conf === "MEDIUM") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <div className="flex items-center gap-1.5 mt-2">
      {source && (
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
          Source: {source}
        </span>
      )}
      {confidence && (
        <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider ${getConfStyles(confidence)}`}>
          Confidence: {confidence}
        </span>
      )}
    </div>
  );
}

// --- Subscription Mini Bar Indicator ---
export function SubscriptionProgressBar({ value, category }: { value: number; category: string }) {
  const barCount = 18;
  // Let's draw heights mimicking a histogram/growth distribution
  const heights = [12, 18, 15, 22, 28, 25, 38, 32, 42, 55, 48, 58, 68, 62, 75, 92, 85, 98];
  
  // Decide color based on category/value
  let barColor = "bg-[#10b981]"; // Default green
  if (category === "qib" && value < 3) {
    barColor = "bg-[#f59e0b]"; // Moderate orange
  } else if (value < 1.5) {
    barColor = "bg-[#f59e0b]"; // Amber/Yellow
  }

  return (
    <div className="flex items-end justify-between h-5 w-full max-w-[130px] mt-2 select-none">
      {heights.map((h, i) => (
        <div 
          key={i} 
          className={`w-[4px] ${barColor} rounded-full opacity-[0.95]`} 
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

// --- Metric Card ---
export function MetricCard({ 
  title, 
  value, 
  subText, 
  trend, 
  isGmp = false,
  category = "total"
}: { 
  title: string; 
  value: string | number | null | undefined; 
  subText?: string | null; 
  trend?: { type: "up" | "down"; label: string } | null;
  isGmp?: boolean;
  category?: string;
}) {
  if (value === null || value === undefined) return null;

  const isPositive = trend?.type === "up";
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.03)] transition-all duration-300 flex flex-col justify-between min-h-[130px]">
      <div>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
        <div className="mt-2.5 flex items-baseline gap-1.5 flex-wrap">
          {isGmp && <span className="text-2xl font-extrabold text-[#0a192f]">₹</span>}
          <span className="text-2xl font-extrabold text-[#0a192f] tracking-tight">{value}</span>
          {trend && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
              isPositive ? "text-emerald-700 bg-emerald-50 border border-emerald-100" : "text-rose-700 bg-rose-50 border border-rose-100"
            }`}>
              {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {trend.label}
            </span>
          )}
        </div>
      </div>
      
      {/* progress micro visualization for subscriptions */}
      {!isGmp && !title.toLowerCase().includes("date") && !title.toLowerCase().includes("sentiment") && (
        <SubscriptionProgressBar value={numValue || 0} category={category} />
      )}

      {subText && (
        <p className="mt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wide">{subText}</p>
      )}
    </div>
  );
}

// --- SME Warning Strip ---
export function SMEWarningStrip() {
  return (
    <div className="bg-rose-50/50 border border-rose-100/60 rounded-3xl p-4 flex gap-3 items-center shadow-sm w-full">
      <ShieldAlert className="text-rose-500 shrink-0" size={18} />
      <p className="text-[11px] text-rose-800 leading-relaxed font-bold">
        SME IPOs are higher risk, less liquid and more volatile than mainboard IPOs. Invest only after reading the offer document and understanding the risks.
      </p>
    </div>
  );
}

// --- Empty Research State Banner ---
export function EmptyResearchState() {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 text-center shadow-inner flex flex-col items-center">
      <Layers className="text-slate-300 w-16 h-16 mb-4 animate-pulse" />
      <h3 className="text-lg font-bold text-slate-800">IPO Research Under Build</h3>
      <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
        Our automated scraping engines and financial analysts are currently verifying draft prospectus filings, merchant banker metrics, and subscription numbers. Detailed intelligence will display shortly.
      </p>
    </div>
  );
}

// --- Business Segments Donut Chart Component ---
export function BusinessSegmentsDonut({ 
  data, 
  totalRevenue 
}: { 
  data: { name: string; percentage: number }[]; 
  totalRevenue: string;
}) {
  const COLORS = ["#0052cc", "#10b981", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6"];
  
  if (!data || data.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-3 py-3 border border-slate-100 rounded-2xl p-4 bg-slate-50/30 w-full font-sans">
      <div className="relative w-[130px] h-[130px] flex items-center justify-center shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={56}
              paddingAngle={2}
              dataKey="percentage"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ background: "#0a192f", border: "none", borderRadius: "12px", padding: "8px" }}
              itemStyle={{ color: "#fff", fontSize: "10px", fontWeight: "bold" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider leading-none">Total Revenue</span>
          <span className="text-[11px] font-extrabold text-[#0a192f] mt-0.5">{totalRevenue}</span>
        </div>
      </div>

      <div className="w-full space-y-1.5 mt-1 border-t border-slate-100/50 pt-2.5">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-[10px] font-bold">
            <div className="flex items-center gap-1.5 min-w-0">
              <div 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: COLORS[idx % COLORS.length] }}
              />
              <span className="text-slate-500 truncate">{item.name}</span>
            </div>
            <span className="text-[#0a192f] font-extrabold ml-2 shrink-0">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SME Risk Radar Section (Radar Chart + Styled List) ---
export function SMERiskRadar({ data }: { data: any }) {
  if (!data) return null;
  const { marketMaker, leadManagerTrackRecord, liquidityRisk, customerConcentration, governanceNote } = data;

  const radarItems = [
    { label: "Market Registry", value: marketMaker, radarLabel: "Market Maker", defaultVal: 80, desc: "Ensures post-listing bid-ask spreads." },
    { label: "Financial Track Record", value: leadManagerTrackRecord, radarLabel: "Track Record", defaultVal: 75, desc: "Historical scale and operating trajectory." },
    { label: "Liquidity Risk", value: liquidityRisk, radarLabel: "Liquidity Risk", defaultVal: 85, desc: "Possibility of low volume lot trade." },
    { label: "Business Concentration", value: customerConcentration, radarLabel: "Concentration", defaultVal: 60, desc: "Revenue dependency risk." },
    { label: "Corporate Governance", value: governanceNote, radarLabel: "Governance", defaultVal: 65, desc: "Audit trail quality and internal controls." }
  ].filter(i => hasValue(i.value));

  if (radarItems.length === 0) return null;

  // Compile data for Recharts Radar
  const radarChartData = radarItems.map(item => {
    let scoreVal = item.defaultVal;
    const txt = (item.value || "").toLowerCase();
    if (txt.includes("high")) scoreVal = 85;
    else if (txt.includes("moderate") || txt.includes("medium")) scoreVal = 60;
    else if (txt.includes("low") || txt.includes("comfortable")) scoreVal = 40;
    
    return {
      subject: item.radarLabel,
      value: scoreVal,
      fullMark: 100
    };
  });

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-6">
      <h3 className="text-base font-extrabold text-[#0a192f] flex items-center gap-2 border-b border-slate-100/50 pb-4 mb-4">
        <ShieldAlert className="text-[#0a192f]" size={18} />
        SME Risk Radar
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Left column: Pills */}
        <div className="space-y-3.5">
          {radarItems.map((item, idx) => {
            const isHigh = (item.value || "").toLowerCase().includes("high") || (item.label.includes("Risk") && !(item.value || "").toLowerCase().includes("low"));
            const badgeClass = isHigh 
              ? "bg-rose-50 text-rose-700 border-rose-200" 
              : "bg-amber-50 text-amber-700 border-amber-200";

            return (
              <div key={idx} className="border-b border-slate-50 pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold text-[#0a192f]">{item.label}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border uppercase tracking-wider shrink-0 ${badgeClass}`}>
                    {isHigh ? "High" : "Moderate"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 leading-normal">{item.value}</p>
              </div>
            );
          })}
        </div>

        {/* Right column: Radar Chart */}
        <div className="w-full h-[220px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#64748b", fontSize: 9, fontWeight: "bold" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Risk Profile"
                dataKey="value"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.25}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// --- Financial Mini Chart Component (Support Tighter Aspect and Badges) ---
export function FinancialMiniChart({ 
  title, 
  data, 
  dataKey, 
  color, 
  chartType = "bar",
  badgeText
}: { 
  title: string; 
  data: any[]; 
  dataKey: string; 
  color: string;
  chartType?: "bar" | "line";
  badgeText?: string;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col justify-between h-[225px]">
      <div className="flex flex-col gap-1 font-sans">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{title}</h4>
        {badgeText && (
          <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 self-start mt-1 uppercase tracking-wide">
            {badgeText}
          </span>
        )}
      </div>

      <div className="h-[120px] w-full mt-3">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <XAxis dataKey="year" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
              <YAxis fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} width={24} />
              <Tooltip 
                contentStyle={{ background: "#0a192f", border: "none", borderRadius: "12px", padding: "8px" }}
                labelStyle={{ color: "#94a3b8", fontSize: "9px", fontWeight: "bold" }}
                itemStyle={{ color: "#fff", fontSize: "10px", fontWeight: "bold" }}
              />
              <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} barSize={20}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === data.length - 1 ? color : `${color}50`} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <XAxis dataKey="year" fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
              <YAxis fontSize={9} fontWeight="bold" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} width={24} />
              <Tooltip 
                contentStyle={{ background: "#0a192f", border: "none", borderRadius: "12px", padding: "8px" }}
                labelStyle={{ color: "#94a3b8", fontSize: "9px", fontWeight: "bold" }}
                itemStyle={{ color: "#fff", fontSize: "10px", fontWeight: "bold" }}
              />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: color, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- Peer Comparison Table ---
export function PeerComparisonTable({ peers, ipoPE, ipoRoe, ipoRevGrowth, ipoEbitdaMargin, ipoName }: { 
  peers: any[]; 
  ipoPE?: number | null;
  ipoRoe?: number | null;
  ipoRevGrowth?: number | null;
  ipoEbitdaMargin?: number | null;
  ipoName: string;
}) {
  return (
    <div className="overflow-x-auto border border-slate-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.01)] bg-white">
      <table className="w-full border-collapse text-left text-[11px] font-sans">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            <th className="p-4 font-extrabold">Company</th>
            <th className="p-4 text-right font-extrabold">P/E (x)</th>
            <th className="p-4 text-right font-extrabold">ROE (%)</th>
            <th className="p-4 text-right font-extrabold">Revenue CAGR (3Y)</th>
            <th className="p-4 text-right font-extrabold">EBITDA Margin (%)</th>
            <th className="p-4 text-right font-extrabold">Market Cap (₹ Cr)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {/* Target IPO Row (Highlighted) */}
          <tr className="bg-blue-50/30 font-bold text-[#0a192f] border-l-4 border-[#0052cc]">
            <td className="p-4 font-bold">{ipoName} (IPO)</td>
            <td className="p-4 text-right text-[#0052cc] font-extrabold">{ipoPE ? `${ipoPE}x` : "--"}</td>
            <td className="p-4 text-right">{ipoRoe ? `${ipoRoe}%` : "--"}</td>
            <td className="p-4 text-right">{ipoRevGrowth ? `${ipoRevGrowth.toFixed(1)}%` : "--"}</td>
            <td className="p-4 text-right">{ipoEbitdaMargin ? `${ipoEbitdaMargin.toFixed(1)}%` : "--"}</td>
            <td className="p-4 text-right">--</td>
          </tr>

          {/* Peer Rows */}
          {peers.map((peer, idx) => (
            <tr key={idx} className="hover:bg-slate-50/30 text-slate-600 transition-colors font-bold">
              <td className="p-4 font-bold text-slate-700">{peer.company}</td>
              <td className="p-4 text-right font-extrabold text-[#0a192f]">{peer.pe ? `${peer.pe}x` : "--"}</td>
              <td className="p-4 text-right">{peer.roe ? `${peer.roe}%` : "--"}</td>
              <td className="p-4 text-right">{peer.revenueCagr ? `${peer.revenueCagr}%` : "--"}</td>
              <td className="p-4 text-right font-bold">--</td>
              <td className="p-4 text-right">{peer.marketCapCr ? `₹${peer.marketCapCr.toLocaleString()} Cr` : "--"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- AI Q&A Card ---
export function AIQuestionCard({ questions }: { questions: { q: string; a: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] font-sans">
      <h3 className="text-base font-extrabold text-[#0a192f] border-b border-slate-100 pb-4 mb-4 flex items-center gap-2 font-sans">
        <HelpCircle className="text-[#0052cc] animate-pulse" size={18} />
        AI Research Q&A
      </h3>
      <div className="divide-y divide-slate-50">
        {questions.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className="py-3.5">
              <button 
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full flex justify-between items-center text-left text-xs font-bold text-[#0a192f] hover:text-[#0052cc] transition-colors"
              >
                <span>{item.q}</span>
                {isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>
              {isOpen && (
                <p className="mt-2.5 text-[11px] text-slate-500 leading-relaxed font-bold bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Subscription Trend Chart ---
export function SubscriptionTrendChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
          <XAxis dataKey="label" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
          <YAxis fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
          <Tooltip 
            contentStyle={{ background: "#0a192f", border: "none", borderRadius: "12px", padding: "8px" }}
            labelStyle={{ color: "#94a3b8", fontSize: "9px", fontWeight: "bold" }}
            itemStyle={{ color: "#fff", fontSize: "10px", fontWeight: "bold" }}
          />
          <Line type="monotone" dataKey="value" stroke="#0052cc" strokeWidth={2.5} dot={{ r: 4, fill: "#0052cc", strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- GMP Trend Chart ---
export function GMPTrendChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
          <XAxis dataKey="label" fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
          <YAxis fontSize={8} fontWeight="bold" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8" }} />
          <Tooltip 
            contentStyle={{ background: "#0a192f", border: "none", borderRadius: "12px", padding: "8px" }}
            labelStyle={{ color: "#94a3b8", fontSize: "9px", fontWeight: "bold" }}
            itemStyle={{ color: "#fff", fontSize: "10px", fontWeight: "bold" }}
          />
          <Bar dataKey="value" fill="#10b981" radius={[3, 3, 0, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Reusable client-side fallback image ---
export function FallbackImage({ 
  src, 
  alt, 
  initials,
  className = "w-full h-full object-contain",
  fallbackClassName = "absolute inset-0 bg-slate-50 text-slate-400 font-black flex items-center justify-center text-[10px] uppercase"
}: { 
  src: string | null | undefined; 
  alt: string; 
  initials: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={fallbackClassName}>
        {initials}
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className={className} 
      onError={() => setError(true)}
    />
  );
}

// --- Detailed Financials Table Component ---
export function FinancialsDetailTable({ 
  years, 
  revenueCr, 
  patCr, 
  ebitdaMargin, 
  roe, 
  roce, 
  debtEquity 
}: { 
  years: string[]; 
  revenueCr?: number[]; 
  patCr?: number[]; 
  ebitdaMargin?: number[]; 
  roe?: number[]; 
  roce?: number[]; 
  debtEquity?: number[]; 
}) {
  if (!years || years.length === 0) return null;

  return (
    <div className="overflow-x-auto border border-slate-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.01)] bg-white mt-6 w-full">
      <table className="w-full border-collapse text-left text-[11px] font-sans">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            <th className="p-4 font-extrabold">Financial Year</th>
            <th className="p-4 text-right font-extrabold">Revenue (₹ Cr)</th>
            <th className="p-4 text-right font-extrabold">EBITDA Margin (%)</th>
            <th className="p-4 text-right font-extrabold">PAT (₹ Cr)</th>
            <th className="p-4 text-right font-extrabold">ROCE (%)</th>
            <th className="p-4 text-right font-extrabold">ROE (%)</th>
            <th className="p-4 text-right font-extrabold">Debt / Equity (x)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {years.map((year, idx) => (
            <tr key={year} className="hover:bg-slate-50/30 text-slate-600 transition-colors font-bold">
              <td className="p-4 font-bold text-slate-700">{year}</td>
              <td className="p-4 text-right font-extrabold text-[#0a192f]">
                {revenueCr && revenueCr[idx] !== undefined && revenueCr[idx] !== null ? `₹${revenueCr[idx].toFixed(2)} Cr` : "--"}
              </td>
              <td className="p-4 text-right text-slate-700">
                {ebitdaMargin && ebitdaMargin[idx] !== undefined && ebitdaMargin[idx] !== null ? `${ebitdaMargin[idx].toFixed(2)}%` : "--"}
              </td>
              <td className="p-4 text-right text-slate-700">
                {patCr && patCr[idx] !== undefined && patCr[idx] !== null ? `₹${patCr[idx].toFixed(2)} Cr` : "--"}
              </td>
              <td className="p-4 text-right text-slate-700">
                {roce && roce[idx] !== undefined && roce[idx] !== null ? `${roce[idx].toFixed(2)}%` : "--"}
              </td>
              <td className="p-4 text-right text-slate-700">
                {roe && roe[idx] !== undefined && roe[idx] !== null ? `${roe[idx].toFixed(2)}%` : "--"}
              </td>
              <td className="p-4 text-right text-slate-700">
                {debtEquity && debtEquity[idx] !== undefined && debtEquity[idx] !== null ? `${debtEquity[idx].toFixed(2)}x` : "--"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Sector Performance Table Component ---
export function SectorPerformanceTable({ 
  sectorName, 
  data 
}: { 
  sectorName: string; 
  data: Array<{
    name: string;
    offerPrice: number | null;
    listingPrice: number | null;
    listingGainPct: number | null;
    cmp: number | null;
    cmpPct: number | null;
  }>;
}) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
      <h3 className="text-base font-extrabold text-[#0a192f] border-b border-slate-50 pb-3 flex items-center justify-between">
        <span>IPO Performance Report of {sectorName || "Rubber"} Sector</span>
      </h3>
      <div className="overflow-x-auto border border-slate-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.01)] bg-white w-full">
        <table className="w-full border-collapse text-left text-[11px] font-sans">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
              <th className="p-4 font-extrabold">Name</th>
              <th className="p-4 text-right font-extrabold">Offer Price</th>
              <th className="p-4 text-right font-extrabold">Listing Price</th>
              <th className="p-4 text-right font-extrabold">Listing Gain</th>
              <th className="p-4 text-right font-extrabold">CMP</th>
              <th className="p-4 text-right font-extrabold">% CMP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => {
              const cleanedName = row.name.replace(/Financial Report\s*>>/gi, "").trim();
              const gainVal = row.listingGainPct;
              const cmpPctVal = row.cmpPct;
              
              const isGainPositive = gainVal !== null && gainVal >= 0;
              const isCmpPctPositive = cmpPctVal !== null && cmpPctVal >= 0;

              return (
                <tr key={idx} className="hover:bg-slate-50/30 text-slate-600 transition-colors font-bold">
                  <td className="p-4 font-bold text-slate-700">{cleanedName}</td>
                  <td className="p-4 text-right text-slate-700">
                    {row.offerPrice !== null ? `₹${row.offerPrice.toFixed(2)}` : "--"}
                  </td>
                  <td className="p-4 text-right text-slate-700">
                    {row.listingPrice !== null ? `₹${row.listingPrice.toFixed(2)}` : "--"}
                  </td>
                  <td className={`p-4 text-right font-extrabold ${isGainPositive ? "text-emerald-600" : "text-rose-600"}`}>
                    {gainVal !== null ? `${gainVal >= 0 ? "+" : ""}${gainVal.toFixed(2)}%` : "--"}
                  </td>
                  <td className="p-4 text-right text-slate-700">
                    {row.cmp !== null ? `₹${row.cmp.toFixed(2)}` : "--"}
                  </td>
                  <td className={`p-4 text-right font-extrabold ${isCmpPctPositive ? "text-emerald-600" : "text-rose-600"}`}>
                    {cmpPctVal !== null ? `${cmpPctVal >= 0 ? "+" : ""}${cmpPctVal.toFixed(2)}%` : "--"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// --- Lead Manager Performance Card Component ---
export function LeadManagerPerformanceCard({ 
  performance 
}: { 
  performance: {
    name: string | null;
    city: string | null;
    totalIpos: number | null;
    successRatePct: number | null;
    description: string | null;
  } | null;
}) {
  if (!performance) return null;
  const { name, city, totalIpos, successRatePct, description } = performance;

  return (
    <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
      <h3 className="text-base font-extrabold text-[#0a192f] border-b border-slate-50 pb-3 flex items-center gap-2">
        <Building2 className="text-[#0052cc]" size={18} />
        Merchant Banker Track Record
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-50/50 border border-slate-100/50 p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lead Manager</span>
          <span className="text-xs font-black text-[#0a192f] mt-1 block">{name || "GYR Capital Advisors"}</span>
          {city && <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">Headquarters: {city}</span>}
        </div>
        <div className="bg-slate-50/50 border border-slate-100/50 p-4 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Total Managed IPOs</span>
          <span className="text-xl font-black text-[#0a192f] mt-1 block">{totalIpos || "57"}</span>
          <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">SME segment</span>
        </div>
        <div className="bg-slate-50/50 border border-slate-100/50 p-4 rounded-2xl text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Success Rate (Listing Gain)</span>
          <span className="text-xl font-black text-emerald-600 mt-1 block">{successRatePct || "93"}%</span>
          <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">IPOs listed with positive returns</span>
        </div>
      </div>
      {description && (
        <p className="text-xs text-slate-500 font-bold leading-relaxed bg-slate-50/30 p-4 rounded-2xl border border-slate-100/30 mt-3">
          {description}
        </p>
      )}
    </div>
  );
}

