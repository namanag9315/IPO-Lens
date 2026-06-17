import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { IPO } from "@/types/ipo";
import { Registrar } from "./types";

export interface AllotmentEligibleIPO {
  ipoId: string;
  name: string;
  slug: string;
  registrar: Registrar | null;
  rawRegistrar: string | null;
  allotmentDate: string | null;
  listingDate: string | null;
  exchange: string | null;
  status: string;
}

export function parseRegistrar(raw: string | null | undefined): Registrar | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("kfin") || lower.includes("karvy")) return "KFINTECH";
  if (lower.includes("link intime") || lower.includes("mufg")) return "MUFG_INTIME";
  if (lower.includes("bigshare")) return "BIGSHARE";
  return null;
}

export async function getAllotmentEligibleIPOs(): Promise<AllotmentEligibleIPO[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("ipos")
    .select("*")
    .in("status", ["closed", "listed"])
    .not("enriched_data->>allotment_date" as any, "is", null)
    .order("enriched_data->>allotment_date" as any, { ascending: false })
    .limit(30);

  if (error || !data) {
    return [];
  }

  return (data as IPO[]).map((ipo) => ({
    ipoId: ipo.id,
    name: ipo.name,
    slug: ipo.slug,
    registrar: parseRegistrar(ipo.registrar_name),
    rawRegistrar: ipo.registrar_name || null,
    allotmentDate: (ipo.enriched_data?.allotment_date as string | undefined) || null,
    listingDate: ipo.listing_date,
    exchange: (ipo.enriched_data?.exchange as string | undefined) || null,
    status: ipo.status,
  }));
}
