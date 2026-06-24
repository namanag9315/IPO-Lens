import type { MetadataRoute } from "next";
import { getComputedIPOs } from "@/lib/ipoData";

const siteUrl = "https://www.ipolens.co.in";

export const dynamic = "force-dynamic";

const staticRoutes: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/calendar", changeFrequency: "daily", priority: 0.9 },
  { path: "/allotment", changeFrequency: "daily", priority: 0.85 },
  { path: "/performance", changeFrequency: "daily", priority: 0.8 },
  { path: "/learn", changeFrequency: "weekly", priority: 0.75 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/blog/advit-jewels", changeFrequency: "monthly", priority: 0.64 },
  { path: "/blog/csm-technologies", changeFrequency: "monthly", priority: 0.64 },
  { path: "/blog/turtlemint-fintech-solutions", changeFrequency: "monthly", priority: 0.64 },
  { path: "/blog/jio-ipo-2026", changeFrequency: "monthly", priority: 0.62 },
  { path: "/blog/why-gmp-is-not-enough", changeFrequency: "monthly", priority: 0.62 },
  { path: "/methodology", changeFrequency: "monthly", priority: 0.55 },
  { path: "/risk-disclosure", changeFrequency: "monthly", priority: 0.5 },
  { path: "/ai-disclosure", changeFrequency: "monthly", priority: 0.45 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/disclaimer", changeFrequency: "yearly", priority: 0.3 },
  { path: "/cookie-policy", changeFrequency: "yearly", priority: 0.25 },
  { path: "/grievance-redressal", changeFrequency: "yearly", priority: 0.25 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const ipos = await getComputedIPOs();

  const pages = staticRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const ipoPages = ipos.map((ipo) => ({
    url: `${siteUrl}/ipo/${ipo.slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: ipo.status === "open" || ipo.status === "upcoming" ? 0.9 : 0.65,
  }));

  return [...pages, ...ipoPages];
}
