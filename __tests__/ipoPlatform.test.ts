import { describe, it, expect, vi } from "vitest";
import * as ipoPlatform from "../lib/scrapers/ipoPlatform";

describe("IPOPlatform Scraper", () => {
  it("automatically discovers Horizon Reclaim IPO URL", async () => {
    const info = await ipoPlatform.findIPOPlatformUrl("Horizon Reclaim (India) Limited");
    expect(info).not.toBeNull();
    expect(info?.slug).toBe("horizon-reclaim-india-ipo");
    expect(info?.id).toBe("4603");
  });

  it("scrapes financial reports, peers, and subscription data for Horizon Reclaim", async () => {
    const data = await ipoPlatform.scrapeIPOPlatform("Horizon Reclaim (India) Limited");
    console.log("TEST SCRAPE SUB DATA:", JSON.stringify(data?.subscription, null, 2));
    expect(data).not.toBeNull();
    expect(data?.leadManager).toBe("GYR Capital");
    expect(data?.financials.length).toBeGreaterThan(0);
    
    // Check first year details
    const fy26 = data?.financials.find(f => f.financial_year === "FY26");
    expect(fy26).toBeDefined();
    expect(fy26?.revenue_cr).toBe(49.42);
    expect(fy26?.pat_cr).toBe(10.5);
    expect(fy26?.roe_pct).toBe(42.29);

    // Check peers
    expect(data?.peers.length).toBeGreaterThan(0);
    expect(data?.peers[0].peer_name).toBeTruthy();
    expect(data?.peers[0].pe_ratio).not.toBeNull();

    // Check subscription (Horizon Reclaim)
    expect(data?.subscription).not.toBeNull();
    expect(data?.subscription?.total_x).toBe(304.11);
    expect(data?.subscription?.qib_x).toBe(186.72);
    expect(data?.subscription?.nii_x).toBe(450.74);
    expect(data?.subscription?.retail_x).toBe(308.3);
  }, 20000);

  it("scrapes anchor investor details for an IPO that has them (Tolins Tyres)", async () => {
    const data = await ipoPlatform.scrapeIPOPlatform("Tolins Tyres Limited", {
      slug: "tolins-tyres-ipo",
      id: "2940",
      url: "https://www.ipoplatform.com/ipo/tolins-tyres-ipo/2940"
    });

    expect(data).not.toBeNull();
    expect(data?.anchorInvestors.length).toBeGreaterThan(0);
    
    const bofa = data?.anchorInvestors.find(a => a.investor_name.includes("BofA"));
    expect(bofa).toBeDefined();
    expect(bofa?.shares_allotted).toBe(707916);
    expect(bofa?.allocation_price).toBe(226);
    expect(bofa?.amount_cr).toBeCloseTo(15.9989, 4);
  }, 20000);

  it("scrapes only subscription data when onlySubscription option is set", async () => {
    const start = Date.now();
    const data = await ipoPlatform.scrapeIPOPlatform("Horizon Reclaim (India) Limited", null, { onlySubscription: true });
    const duration = Date.now() - start;
    console.log(`Scraped only subscription data in ${duration}ms`);

    expect(data).not.toBeNull();
    expect(data?.subscription).not.toBeNull();
    expect(data?.subscription?.total_x).toBe(304.11);
    
    // Non-subscription fields should be empty/null
    expect(data?.leadManager).toBeNull();
    expect(data?.financials.length).toBe(0);
    expect(data?.peers.length).toBe(0);
    expect(data?.anchorInvestors.length).toBe(0);
    expect(data?.reviewText).toBeNull();
  }, 20000);
});

