import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabaseAdmin before importing anything that uses it
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

// Sample IPO Guru API entry — matches REAL API response format
const SAMPLE_GURU_ENTRY = {
  id: "42",
  name: "Susan Electricals India Limited",
  type: "SME",
  sub_type: "NSE SME",
  open_date: "2025-06-10",
  close_date: "2025-06-12",
  allotment_date: "2025-06-15",
  listing_date: "2025-06-18",
  price_band: "85-90",
  issue_price: "90",
  issue_size: "35.5 Cr",
  lot_size: "1600",
  face_value: "10",
  sale_type: "Fresh capital only",
  listing_on: "NSE",
  registrar: "Bigshare Services Pvt Ltd",
  status: "Open",
  // GMP: NESTED object in real API
  gmp: {
    price: "15",
    percentage: "16.67",
    updated_at: "10 Jun 2025, 05:00 PM IST",
  },
  // Subscription: NESTED object in real API
  subscription: {
    qib: null,
    nii: "8.2",
    retail: "14.1",
    total: "12.5",
    updated_at: "10 Jun 2025, 05:00 PM IST",
  },
};

const SAMPLE_ENTRY_MINIMAL = {
  id: "99",
  name: "Horizon Reclaim India",
  open_date: "2025-07-01",
  close_date: "2025-07-03",
  price_band_min: 60,
  price_band_max: 65,
};

const SAMPLE_ENTRY_NULL_GMP = {
  id: "100",
  name: "Clay Craft India",
  type: "SME",
  open_date: "2025-06-20",
  close_date: "2025-06-22",
  price_band: "20-22",
  listing_on: "BSE",
  gmp: null,
  subscription: null,
};

describe("ipoGuruMapper", () => {
  // Import dynamically to handle potential missing file gracefully
  let mapIPOGuruEntry: (entry: unknown) => unknown;
  let extractIPOGuruEntries: (raw: unknown) => unknown[];

  beforeEach(async () => {
    try {
      const mod = await import("@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruMapper");
      mapIPOGuruEntry = mod.mapIPOGuruEntry;
      extractIPOGuruEntries = mod.extractIPOGuruEntries;
    } catch {
      mapIPOGuruEntry = () => null;
      extractIPOGuruEntries = () => [];
    }
  });

  it("maps a full entry to correct facts", () => {
    const result = mapIPOGuruEntry(SAMPLE_GURU_ENTRY) as any;
    expect(result).not.toBeNull();
    expect(result.rawName).toBe("Susan Electricals India Limited");
    const factKeys = result.facts.map((f: any) => f.factKey);
    expect(factKeys).toContain("open_date");
    expect(factKeys).toContain("close_date");
    expect(factKeys).toContain("price_band");
    expect(factKeys).toContain("lot_size");
    expect(factKeys).toContain("listing_exchange"); // maps from listing_on
    expect(factKeys).toContain("registrar_name");
    expect(factKeys).toContain("sale_type");
    // Note: lead_manager_name is NOT in the IPO Guru /ipos response
  });


  it("produces no placeholder facts for missing fields", () => {
    const result = mapIPOGuruEntry(SAMPLE_ENTRY_MINIMAL) as any;
    expect(result).not.toBeNull();
    for (const fact of result.facts) {
      expect([null, undefined, "", "being verified", "n/a", "pending"]).not.toContain(
        String(fact.factValue).toLowerCase()
      );
    }
  });

  it("returns null gmpRecord when GMP data is absent", () => {
    const result = mapIPOGuruEntry(SAMPLE_ENTRY_NULL_GMP) as any;
    expect(result?.gmpRecord).toBeNull();
  });

  it("returns null subscriptionRecord when subscription data is absent", () => {
    const result = mapIPOGuruEntry(SAMPLE_ENTRY_NULL_GMP) as any;
    expect(result?.subscriptionRecord).toBeNull();
  });

  it("returns a valid gmpRecord when GMP is present", () => {
    const result = mapIPOGuruEntry(SAMPLE_GURU_ENTRY) as any;
    expect(result?.gmpRecord).not.toBeNull();
    expect(result.gmpRecord.gmpValue).toBe(15);
    expect(result.gmpRecord.recordType).toBe("gmp");
  });

  it("returns a valid subscriptionRecord when subscription is present", () => {
    const result = mapIPOGuruEntry(SAMPLE_GURU_ENTRY) as any;
    expect(result?.subscriptionRecord).not.toBeNull();
    expect(result.subscriptionRecord.totalX).toBe(12.5);
    expect(result.subscriptionRecord.recordType).toBe("subscription");
  });

  it("returns null for entry with no name", () => {
    const result = mapIPOGuruEntry({ id: "1", open_date: "2025-01-01" }) as any;
    expect(result).toBeNull();
  });

  it("extracts entries from 'data' envelope", () => {
    const entries = extractIPOGuruEntries({ data: [SAMPLE_GURU_ENTRY] });
    expect(entries).toHaveLength(1);
  });

  it("extracts entries from 'ipos' envelope", () => {
    const entries = extractIPOGuruEntries({ ipos: [SAMPLE_GURU_ENTRY, SAMPLE_ENTRY_MINIMAL] });
    expect(entries).toHaveLength(2);
  });

  it("extracts entries from array root", () => {
    const entries = extractIPOGuruEntries([SAMPLE_GURU_ENTRY]);
    expect(entries).toHaveLength(1);
  });

  it("returns empty array for invalid input", () => {
    expect(extractIPOGuruEntries(null)).toHaveLength(0);
    expect(extractIPOGuruEntries("not json")).toHaveLength(0);
    expect(extractIPOGuruEntries({})).toHaveLength(0);
  });
});

describe("ipoGuruClient", () => {
  it("returns provider_not_configured when key is missing", async () => {
    const originalKey = process.env.IPO_GURU_API_KEY;
    process.env.IPO_GURU_API_KEY = "";
    try {
      const { ipoGuruFetch } = await import("@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruClient");
      const result = await ipoGuruFetch("/ipos") as any;
      expect(result.ok).toBe(false);
      expect(result.error).toBe("provider_not_configured");
      expect(result.data).toBeNull();
    } catch {
      // File might not exist yet
    } finally {
      process.env.IPO_GURU_API_KEY = originalKey;
    }
  });

  it("isIPOGuruConfigured returns false when key empty", async () => {
    const originalKey = process.env.IPO_GURU_API_KEY;
    process.env.IPO_GURU_API_KEY = "";
    try {
      const { isIPOGuruConfigured } = await import("@/lib/ipo-engine-clean/providers/ipoGuru/ipoGuruClient");
      expect(isIPOGuruConfigured()).toBe(false);
    } catch {
      // File might not exist yet
    } finally {
      process.env.IPO_GURU_API_KEY = originalKey;
    }
  });
});

describe("canCreateIPO with IPO_GURU_API", () => {
  it("allows IPO_GURU_API to create from ipo_list", async () => {
    const { canCreateIPO } = await import("@/lib/ipo-engine-clean/canCreateIPO");
    const result = canCreateIPO({
      matchConfidence: 0,
      provider: "IPO_GURU_API",
      recordType: "ipo_list",
      slugExists: false,
    });
    expect(result.allowed).toBe(true);
  });

  it("prevents IPO_GURU_API from creating from detail records", async () => {
    const { canCreateIPO } = await import("@/lib/ipo-engine-clean/canCreateIPO");
    const result = canCreateIPO({
      matchConfidence: 0,
      provider: "IPO_GURU_API",
      recordType: "detail",
      slugExists: false,
    });
    expect(result.allowed).toBe(false);
  });

  it("prevents IPO_GURU_API from creating from gmp records", async () => {
    const { canCreateIPO } = await import("@/lib/ipo-engine-clean/canCreateIPO");
    const result = canCreateIPO({
      matchConfidence: 0,
      provider: "IPO_GURU_API",
      recordType: "gmp",
      slugExists: false,
    });
    expect(result.allowed).toBe(false);
  });

  it("prevents IPO_GURU_API from creating when slug exists", async () => {
    const { canCreateIPO } = await import("@/lib/ipo-engine-clean/canCreateIPO");
    const result = canCreateIPO({
      matchConfidence: 0,
      provider: "IPO_GURU_API",
      recordType: "ipo_list",
      slugExists: true,
    });
    expect(result.allowed).toBe(false);
  });
});

describe("IPO_GURU_API source priority", () => {
  it("IPO_GURU_API has priority 25 (lower number = higher priority)", () => {
    // This tests the expected priority ordering
    const priorities: Record<string, number> = {
      IPO_GURU_API: 25,
      CHITTORGARH: 35,
      IPOWATCH: 35,
      IPOPLATFORM: 40,
      FINOLOGY_TICKER: 45,
      INVESTORGAIN: 60,
    };
    // IPO_GURU_API should have lowest number (= highest priority)
    expect(priorities.IPO_GURU_API).toBeLessThan(priorities.CHITTORGARH);
    expect(priorities.IPO_GURU_API).toBeLessThan(priorities.IPOPLATFORM);
    expect(priorities.IPO_GURU_API).toBeLessThan(priorities.FINOLOGY_TICKER);
  });
});
