import { describe, it, expect } from "vitest";
import { getLiveIndices } from "../lib/ipoData";

describe("Live Indices", () => {
  it("fetches live indices from Yahoo Finance", async () => {
    const indices = await getLiveIndices();
    console.log("Fetched Indices:", JSON.stringify(indices, null, 2));
    expect(indices).toBeInstanceOf(Array);
    expect(indices.length).toBe(4);
    
    // Check that we have NIFTY 50, SENSEX, NIFTY BANK, and INDIA VIX
    const labels = indices.map(i => i.label);
    expect(labels).toContain("NIFTY 50");
    expect(labels).toContain("SENSEX");
    expect(labels).toContain("NIFTY BANK");
    expect(labels).toContain("INDIA VIX");

    indices.forEach(idx => {
      expect(idx.value).toBeDefined();
      expect(idx.change).toBeDefined();
      expect(idx.tone).toBeDefined();
      expect(["positive", "negative"]).toContain(idx.tone);
    });
  }, 15000); // 15s timeout
});
