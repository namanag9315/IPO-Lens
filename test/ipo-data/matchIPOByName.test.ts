import { describe, it, expect } from "vitest";
import { normalizeIPOName } from "../../lib/ipo-data/normalizeIPOName";
import { matchIPOByName, type IPOReference, type IPOAlias } from "../../lib/ipo-data/matchIPOByName";

describe("normalizeIPOName", () => {
  it("lowercases and removes common corporate suffixes", () => {
    expect(normalizeIPOName("Susan Electricals Limited")).toBe("susan electricals");
    expect(normalizeIPOName("Susan Electricals Pvt Ltd")).toBe("susan electricals");
    expect(normalizeIPOName("Susan Electricals LLP")).toBe("susan electricals");
    expect(normalizeIPOName("Susan Electricals Private Limited")).toBe("susan electricals");
  });

  it("removes IPO tags", () => {
    expect(normalizeIPOName("Susan Electricals SME IPO")).toBe("susan electricals");
    expect(normalizeIPOName("Susan Electricals Mainboard IPO")).toBe("susan electricals");
    expect(normalizeIPOName("Susan Electricals Initial Public Offer")).toBe("susan electricals");
  });

  it("converts ampersand", () => {
    expect(normalizeIPOName("Susan & Sons")).toBe("susan and sons");
  });
});

describe("matchIPOByName", () => {
  const ipos: IPOReference[] = [
    { id: "1", name: "Susan Electricals", slug: "susan-electricals", open_date: null, close_date: null, listing_date: null, status: "open" },
    { id: "2", name: "Tech Solutions", slug: "tech-solutions", open_date: null, close_date: null, listing_date: null, status: "open" }
  ];

  const aliases: IPOAlias[] = [
    { ipo_id: "1", normalized_alias: "susan electric", source: "IPO Guru" }
  ];

  it("matches by exact slug", () => {
    const result = matchIPOByName("susan electricals", "Any Source", ipos, aliases);
    expect(result?.matchType).toBe("slug");
    expect(result?.score).toBe(1);
    expect(result?.ipo.id).toBe("1");
  });

  it("matches by exact normalized name", () => {
    const result = matchIPOByName("Susan Electricals Limited", "Any Source", ipos, aliases);
    expect(result?.matchType).toBe("slug");
    expect(result?.score).toBe(1);
    expect(result?.ipo.id).toBe("1");
  });

  it("matches by alias when source matches", () => {
    const result = matchIPOByName("Susan Electric SME IPO", "IPO Guru", ipos, aliases);
    expect(result?.matchType).toBe("alias");
    expect(result?.score).toBe(1);
    expect(result?.ipo.id).toBe("1");
  });

  it("does not match alias if source differs", () => {
    const result = matchIPOByName("Susan Electric SME IPO", "Other Source", ipos, aliases);
    // Might fallback to fuzzy match if scores > 0, let's see.
    // Susan Electric (tokens: susan, electric) vs Susan Electricals (tokens: susan, electricals)
    // "susan electric" includes "susan" -> matches = 1/2 = 0.5. Since < 0.7, it's low score, but the test just checks the fallback
    expect(result?.matchType).toBe("fuzzy");
    expect(result?.score).toBeLessThan(1);
  });

  it("returns fuzzy match for partial names", () => {
    const result = matchIPOByName("Susan", "Any", ipos, aliases);
    expect(result?.matchType).toBe("fuzzy");
    expect(result?.score).toBeGreaterThan(0.4);
  });
});
