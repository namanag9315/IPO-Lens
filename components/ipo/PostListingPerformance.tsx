"use client";

import { CheckCircle2, LineChart as LineChartIcon, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IPOListingPerformance } from "@/types/ipo";

interface PostListingPerformanceProps {
  listingDate: string | null;
  performance: IPOListingPerformance | null;
  score: number | null;
}

function hasListed(listingDate: string | null) {
  if (!listingDate) return false;
  return new Date(`${listingDate}T00:00:00+05:30`).getTime() <= Date.now();
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number") return "--";
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
}

function formatPct(value: number | null | undefined) {
  if (typeof value !== "number") return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function gainTone(value: number | null | undefined) {
  if (typeof value !== "number") return "text-slate-300 border-slate-600 bg-slate-800";
  return value >= 0
    ? "text-emerald-200 border-emerald-500/40 bg-emerald-500/15"
    : "text-red-200 border-red-500/40 bg-red-500/15";
}

function latestKnownPrice(performance: IPOListingPerformance) {
  return (
    performance.current_price ??
    performance.price_3m ??
    performance.price_1m ??
    performance.price_1w ??
    performance.listing_day_close ??
    performance.listing_price ??
    null
  );
}

function returnFromIssue(price: number | null, issuePrice: number | null) {
  if (typeof price !== "number" || typeof issuePrice !== "number" || issuePrice <= 0) return null;
  return ((price - issuePrice) / issuePrice) * 100;
}

function chartRows(performance: IPOListingPerformance) {
  const issuePrice = performance.issue_price ?? null;
  const currentPrice = latestKnownPrice(performance);
  const currentReturn = performance.return_current_pct ?? returnFromIssue(currentPrice, issuePrice);
  const rows = [
    { label: "Issue Price", price: issuePrice, returnPct: 0 },
    { label: "Listing", price: performance.listing_price, returnPct: performance.listing_gain_pct },
    { label: "1W", price: performance.price_1w, returnPct: performance.return_1w_pct },
    { label: "1M", price: performance.price_1m, returnPct: performance.return_1m_pct },
    { label: "3M", price: performance.price_3m, returnPct: performance.return_3m_pct },
  ].filter((row) => typeof row.price === "number");

  if (typeof currentPrice === "number" && !rows.some((row) => row.price === currentPrice)) {
    rows.push({ label: "Current", price: currentPrice, returnPct: currentReturn });
  }

  return rows;
}

function TooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs shadow-xl">
      <p className="font-black text-white">{row.label}</p>
      <p className="mt-1 font-bold text-slate-300">{formatCurrency(row.price)}</p>
      <p className={row.returnPct >= 0 ? "font-bold text-emerald-300" : "font-bold text-red-300"}>
        {formatPct(row.returnPct)}
      </p>
    </div>
  );
}

export default function PostListingPerformance({ listingDate, performance, score }: PostListingPerformanceProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!hasListed(listingDate)) {
    return null;
  }

  if (!performance) {
    return (
      <section className="rounded-[28px] border border-slate-800 bg-[#0f172a] p-6 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200">
            <LineChartIcon size={13} />
            Post-listing performance
          </span>
          <h3 className="text-lg font-black text-white">Performance sync pending</h3>
          <p className="max-w-2xl text-sm font-semibold leading-relaxed text-slate-300">
            This IPO has listed. Price tracking will appear here after the daily market-close sync captures listing day data.
          </p>
        </div>
      </section>
    );
  }

  const rows = chartRows(performance);
  const listingGain = performance.listing_gain_pct ?? null;
  const currentPrice = latestKnownPrice(performance);
  const currentReturn = performance.return_current_pct ?? returnFromIssue(currentPrice, performance.issue_price ?? null);
  const scoreValue = score ?? performance.ipo_lens_score ?? null;

  return (
    <section className="rounded-[28px] border border-slate-800 bg-[#0f172a] p-5 text-white shadow-[0_18px_55px_rgba(15,23,42,0.16)] sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200">
            <LineChartIcon size={13} />
            Post-listing performance
          </span>
          <h3 className="mt-3 text-xl font-black tracking-tight text-white">Score vs market outcome</h3>
          <p className="mt-1 max-w-2xl text-xs font-semibold leading-relaxed text-slate-300">
            Listing and milestone prices are tracked after market close to compare IPO Lens scores against actual outcomes.
          </p>
        </div>

        <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${gainTone(listingGain)}`}>
          {typeof listingGain === "number" && listingGain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {formatPct(listingGain)} on listing day
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Listing Price", formatCurrency(performance.listing_price)],
          ["Listing Gain", formatPct(performance.listing_gain_pct)],
          ["Current Price", formatCurrency(currentPrice)],
          ["Return from Issue", formatPct(currentReturn)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-2 text-lg font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="h-[280px] min-w-[640px] rounded-2xl border border-slate-700 bg-slate-950/55 p-3">
          {isMounted ? (
            <ResponsiveContainer height="100%" minWidth={0} width="100%">
              <LineChart data={rows} margin={{ bottom: 10, left: 0, right: 16, top: 18 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#94a3b8" tick={{ fill: "#cbd5e1", fontSize: 11, fontWeight: 700 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: "#cbd5e1", fontSize: 11, fontWeight: 700 }} />
                <Tooltip content={<TooltipContent />} />
                {typeof performance.issue_price === "number" ? (
                  <ReferenceLine
                    y={performance.issue_price}
                    stroke="#f59e0b"
                    strokeDasharray="6 5"
                    label={{ value: "Issue price", fill: "#fbbf24", fontSize: 11, fontWeight: 800 }}
                  />
                ) : null}
                <Line
                  activeDot={{ fill: "#f59e0b", r: 6, stroke: "#fff", strokeWidth: 2 }}
                  dataKey="price"
                  dot={{ fill: "#22c55e", r: 4, stroke: "#0f172a", strokeWidth: 2 }}
                  stroke="#22c55e"
                  strokeWidth={3}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
        {performance.score_validated ? (
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={18} />
            <div>
              <p className="text-sm font-black text-emerald-200">IPO Lens Score Validated</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-300">
                Our {scoreValue ?? "--"}/100 score correctly predicted this IPO&apos;s performance.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm font-black text-amber-200">Score vs Outcome</p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-300">
              Our score was {scoreValue ?? "--"}/100. Actual listing: {formatPct(listingGain)}.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
