"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ListingPerformanceDashboardRow } from "@/lib/services/listingPerformance";

type FilterKey = "all" | "high" | "mid" | "low";
type SegmentKey = "all" | "mainboard" | "sme";
type SortKey = "listing_date" | "name" | "segment" | "score" | "listing_gain_pct" | "return_from_issue_pct" | "score_validated";

interface ScoreAccuracyDashboardProps {
  rows: ListingPerformanceDashboardRow[];
}

function numeric(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatPct(value: number | null | undefined) {
  const num = numeric(value);
  if (num === null) return "--";
  return `${num > 0 ? "+" : ""}${num.toFixed(1)}%`;
}

function avg(values: Array<number | null | undefined>) {
  const nums = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (nums.length === 0) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function gainClass(value: number | null | undefined) {
  const num = numeric(value);
  if (num === null) return "text-slate-500";
  return num >= 0 ? "text-emerald-600" : "text-red-600";
}

function scoreBucket(row: ListingPerformanceDashboardRow) {
  const score = row.ipo_lens_score ?? 0;
  if (score >= 70) return "Score 70+";
  if (score < 40) return "Score <40";
  return "Score 40-70";
}

function rowSegment(row: ListingPerformanceDashboardRow): Exclude<SegmentKey, "all"> {
  if (row.ipo?.category === "mainboard" || row.ipo?.category === "sme") {
    return row.ipo.category;
  }

  return row.exchange === "NSE" ? "mainboard" : "sme";
}

function segmentLabel(row: ListingPerformanceDashboardRow) {
  return rowSegment(row) === "mainboard" ? "Mainboard" : "SME";
}

function listingDate(row: ListingPerformanceDashboardRow) {
  return row.ipo?.listing_date ?? row.data_updated_at?.slice(0, 10) ?? row.created_at?.slice(0, 10) ?? "";
}

function listingDateTime(row: ListingPerformanceDashboardRow) {
  const value = listingDate(row);
  if (!value) return 0;
  return new Date(`${value}T00:00:00+05:30`).getTime();
}

function formatDate(value: string) {
  if (!value) return "--";
  const date = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function filterRows(rows: ListingPerformanceDashboardRow[], filter: FilterKey, segment: SegmentKey) {
  return rows.filter((row) => {
    if (segment !== "all" && rowSegment(row) !== segment) {
      return false;
    }

    if (filter === "high") return (row.ipo_lens_score ?? 0) >= 70;
    if (filter === "low") return (row.ipo_lens_score ?? 0) < 40;
    if (filter === "mid") return (row.ipo_lens_score ?? 0) >= 40 && (row.ipo_lens_score ?? 0) < 70;
    return true;
  });
}

function sortRows(rows: ListingPerformanceDashboardRow[], sortKey: SortKey, direction: "asc" | "desc") {
  const sorted = rows.slice().sort((a, b) => {
    if (sortKey === "listing_date") {
      return listingDateTime(a) - listingDateTime(b);
    }

    if (sortKey === "name") {
      return (a.ipo?.name ?? "").localeCompare(b.ipo?.name ?? "");
    }

    if (sortKey === "segment") {
      return segmentLabel(a).localeCompare(segmentLabel(b));
    }

    if (sortKey === "score_validated") {
      return Number(Boolean(a.score_validated)) - Number(Boolean(b.score_validated));
    }

    const left = numeric(sortKey === "score" ? a.ipo_lens_score : a[sortKey]) ?? Number.NEGATIVE_INFINITY;
    const right = numeric(sortKey === "score" ? b.ipo_lens_score : b[sortKey]) ?? Number.NEGATIVE_INFINITY;
    return left - right;
  });

  return direction === "asc" ? sorted : sorted.reverse();
}

function regression(points: Array<{ score: number; gain: number }>) {
  if (points.length < 2) return null;

  const n = points.length;
  const sumX = points.reduce((sum, point) => sum + point.score, 0);
  const sumY = points.reduce((sum, point) => sum + point.gain, 0);
  const sumXY = points.reduce((sum, point) => sum + point.score * point.gain, 0);
  const sumXX = points.reduce((sum, point) => sum + point.score * point.score, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const minX = Math.min(...points.map((point) => point.score));
  const maxX = Math.max(...points.map((point) => point.score));

  return {
    start: { x: minX, y: slope * minX + intercept },
    end: { x: maxX, y: slope * maxX + intercept },
  };
}

function ScatterTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-xl">
      <p className="font-black text-slate-950">{row.name}</p>
      <p className="mt-1 font-bold text-slate-600">Score: {row.score}/100</p>
      <p className={row.gain >= 0 ? "font-bold text-emerald-600" : "font-bold text-red-600"}>
        Listing gain: {formatPct(row.gain)}
      </p>
    </div>
  );
}

export default function ScoreAccuracyDashboard({ rows }: ScoreAccuracyDashboardProps) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [isMounted, setIsMounted] = useState(false);
  const [segment, setSegment] = useState<SegmentKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("listing_date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const scoredRows = useMemo(
    () => rows.filter((row) => numeric(row.ipo_lens_score) !== null && numeric(row.listing_gain_pct) !== null),
    [rows],
  );

  const highScoreRows = scoredRows.filter((row) => (row.ipo_lens_score ?? 0) >= 70);
  const lowScoreRows = scoredRows.filter((row) => (row.ipo_lens_score ?? 0) < 40);
  const highPositive = highScoreRows.filter((row) => (row.listing_gain_pct ?? 0) > 0).length;

  const visibleRows = useMemo(
    () => sortRows(filterRows(rows, filter, segment), sortKey, sortDirection),
    [filter, rows, segment, sortDirection, sortKey],
  );

  const scatterData = scoredRows.map((row) => ({
    gain: row.listing_gain_pct ?? 0,
    name: row.ipo?.name ?? row.symbol ?? "Listed IPO",
    score: row.ipo_lens_score ?? 0,
    validated: Boolean(row.score_validated),
  }));
  const trend = regression(scatterData);

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection(nextKey === "name" ? "asc" : "desc");
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1280px] space-y-7">
        <header className="space-y-2">
          <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
            Post-listing validation
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Score Accuracy Dashboard</h1>
          <p className="max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
            How well does IPO Lens predict IPO performance?
          </p>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            {
              label: "High-score positive listings",
              value: `${highPositive} / ${highScoreRows.length}`,
              text: `${highPositive} out of ${highScoreRows.length} IPOs scored above 70 had positive listing gains`,
            },
            {
              label: "Average gain for score 70+",
              value: formatPct(avg(highScoreRows.map((row) => row.listing_gain_pct))),
              text: "Average listing gain for IPOs scored 70+",
            },
            {
              label: "Average gain for score <40",
              value: formatPct(avg(lowScoreRows.map((row) => row.listing_gain_pct))),
              text: "Average listing gain for IPOs scored below 40",
            },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">{card.label}</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
              <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">{card.text}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Score vs listing gain</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Each dot represents one listed IPO.</p>
            </div>
            <div className="text-xs font-bold text-slate-500">
              {scatterData.length} IPOs with score and listing gain data
            </div>
          </div>

          {scatterData.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-500">
              No scored listing outcomes yet.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <div className="h-[360px] min-w-[720px] rounded-xl border border-slate-200 bg-slate-50 p-3">
                {isMounted ? (
                  <ResponsiveContainer height="100%" minWidth={0} width="100%">
                    <ScatterChart margin={{ bottom: 20, left: 8, right: 24, top: 18 }}>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="score"
                        domain={[0, 100]}
                        name="IPO Lens Score"
                        stroke="#64748b"
                        tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
                        type="number"
                      />
                      <YAxis
                        dataKey="gain"
                        name="Listing Gain"
                        stroke="#64748b"
                        tick={{ fill: "#475569", fontSize: 11, fontWeight: 700 }}
                        tickFormatter={(value) => `${value}%`}
                        type="number"
                      />
                      <Tooltip content={<ScatterTooltip />} />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                      {trend ? (
                        <ReferenceLine
                          segment={[
                            { x: trend.start.x, y: trend.start.y },
                            { x: trend.end.x, y: trend.end.y },
                          ]}
                          stroke="#f59e0b"
                          strokeDasharray="8 5"
                          strokeWidth={2}
                        />
                      ) : null}
                      <Scatter data={scatterData} name="Listed IPOs">
                        {scatterData.map((entry) => (
                          <Cell fill={entry.validated ? "#22c55e" : entry.gain >= 0 ? "#f59e0b" : "#ef4444"} key={`${entry.name}-${entry.score}`} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Listed IPO outcomes</h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">Ordered by listing date. Filter by score band or market segment.</p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "All"],
                  ["mainboard", "Mainboard"],
                  ["sme", "SME"],
                ].map(([key, label]) => (
                  <button
                    className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                      segment === key
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    key={key}
                    onClick={() => setSegment(key as SegmentKey)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "All Scores"],
                  ["high", "Score 70+"],
                  ["mid", "Score 40-70"],
                  ["low", "Score <40"],
                ].map(([key, label]) => (
                  <button
                    className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                      filter === key
                        ? "border-amber-500 bg-amber-400 text-slate-950"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    key={key}
                    onClick={() => setFilter(key as FilterKey)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-500">
              No IPOs found for this filter.
            </div>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[1080px] w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                    {[
                      ["listing_date", "Listing Date"],
                      ["name", "IPO Name"],
                      ["segment", "Segment"],
                      ["score", "Score"],
                      ["listing_gain_pct", "Listing Gain"],
                      ["return_from_issue_pct", "Current Return"],
                      ["score_validated", "Score Accurate?"],
                    ].map(([key, label]) => (
                      <th className="py-3 pr-4" key={key}>
                        <button className="font-black hover:text-slate-950" onClick={() => toggleSort(key as SortKey)} type="button">
                          {label} {sortKey === key ? (sortDirection === "asc" ? "↑" : "↓") : ""}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr className="border-b border-slate-100 hover:bg-slate-50/80" key={row.id}>
                      <td className="py-4 pr-4">
                        <div className="text-xs font-black text-slate-700">{formatDate(listingDate(row))}</div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap items-center gap-2 font-black text-slate-950">
                          <span>{row.ipo?.name ?? "Unknown IPO"}</span>
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {row.symbol ? `${row.symbol} • ` : ""}
                          {scoreBucket(row)}
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                          {segmentLabel(row)}
                        </span>
                      </td>
                      <td className="py-4 pr-4 font-black text-slate-950">{row.ipo_lens_score ?? "--"}</td>
                      <td className={`py-4 pr-4 font-black ${gainClass(row.listing_gain_pct)}`}>{formatPct(row.listing_gain_pct)}</td>
                      <td className={`py-4 pr-4 font-black ${gainClass(row.return_from_issue_pct)}`}>{formatPct(row.return_from_issue_pct)}</td>
                      <td className="py-4 pr-4">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                            row.score_validated
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }`}
                        >
                          {row.score_validated ? "Validated" : "Mixed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
