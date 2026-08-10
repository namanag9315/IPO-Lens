import { getComputedIPOs } from "@/lib/ipoData";
import { supabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import { maskApplicationNumber, maskDematId, maskPAN } from "@/lib/allotment/mask";
import { officialLinkFor } from "@/lib/allotment/registrarLinks";
import { parseRegistrarName } from "@/lib/allotment/validation";
import { bigshareProvider } from "@/lib/allotment/providers/bigshareProvider";
import { bseProvider } from "@/lib/allotment/providers/bseProvider";
import { kfintechProvider } from "@/lib/allotment/providers/kfintechProvider";
import { mockProvider } from "@/lib/allotment/providers/mockProvider";
import { mufgIntimeProvider } from "@/lib/allotment/providers/mufgIntimeProvider";
import { nseProvider } from "@/lib/allotment/providers/nseProvider";
import type { AllotmentCheckRequest, AllotmentCheckResponse, AllotmentIPOOption, AllotmentRegistrar } from "@/lib/allotment/types";
import type { ComputedIPO } from "@/types/ipo";

const providers = {
  BIGSHARE: bigshareProvider,
  BSE: bseProvider,
  KFINTECH: kfintechProvider,
  MOCK: mockProvider,
  MUFG_INTIME: mufgIntimeProvider,
  NSE: nseProvider,
};

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function ipoToAllotmentOption(ipo: ComputedIPO): AllotmentIPOOption {
  const extended = ipo as ComputedIPO & {
    allotment_date?: string | null;
    exchange?: string | null;
    registrar?: string | null;
    registrar_name?: string | null;
  };
  const registrarName = optionalString(extended.registrar_name) ?? optionalString(extended.registrar);
  const registrar = parseRegistrarName(registrarName) ?? "BSE";

  return {
    allotmentDate: extended.allotment_date ?? null,
    exchange: extended.exchange ?? "NSE/BSE",
    id: ipo.id,
    listingDate: ipo.listing_date,
    name: ipo.name,
    registrar,
    registrarName: registrarName ?? "Registrar not available",
    retailSubscription: ipo.latest_subscription?.retail_x ?? null,
    slug: ipo.slug,
    status: ipo.status,
  };
}

function dateDaysFromToday(value: string | null) {
  if (!value) {
    return null;
  }

  const day = new Date(`${value}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round((day.getTime() - today.getTime()) / 86_400_000);
}

export async function getAllotmentIPOOptions(): Promise<AllotmentIPOOption[]> {
  const ipos = await getComputedIPOs();

  return ipos
    .map(ipoToAllotmentOption)
    .filter((ipo) => {
      const days = dateDaysFromToday(ipo.allotmentDate);
      const hasRelevantStatus = ipo.status === "closed" || ipo.status === "listed";

      if (days !== null) {
        return days >= -30 && days <= 14;
      }

      return hasRelevantStatus;
    })
    .sort((a, b) => (a.allotmentDate ?? "9999-12-31").localeCompare(b.allotmentDate ?? "9999-12-31"));
}

export async function findAllotmentIPO(ipoIdOrSlug: string) {
  const options = await getAllotmentIPOOptions();

  return options.find((ipo) => ipo.id === ipoIdOrSlug || ipo.slug === ipoIdOrSlug) ?? null;
}

function maskResponse(request: AllotmentCheckRequest, response: AllotmentCheckResponse): AllotmentCheckResponse {
  return {
    ...response,
    applicationNumberMasked:
      response.applicationNumberMasked ?? (request.checkType === "APPLICATION_NO" ? maskApplicationNumber(request.value) : null),
    panMasked: response.panMasked ?? (request.checkType === "PAN" ? maskPAN(request.value) : null),
  };
}

export async function logAllotmentCheck(input: {
  checkType: string;
  ipoId: string | null;
  provider: string;
  registrar: string;
  status: string;
}) {
  if (!isSupabaseConfigured()) {
    return;
  }

  try {
    await supabaseAdmin.from("ipo_allotment_check_logs").insert({
      check_type: input.checkType,
      ipo_id: input.ipoId,
      provider: input.provider,
      registrar: input.registrar,
      status: input.status,
    });
  } catch {
    // Sanitized logging must never block the user-facing result.
  }
}

export async function checkAllotment(request: AllotmentCheckRequest): Promise<AllotmentCheckResponse> {
  const ipo = await findAllotmentIPO(request.ipoId);

  if (!ipo) {
    const checkedAt = new Date().toISOString();

    return {
      allottedShares: null,
      applicationNumberMasked: request.checkType === "APPLICATION_NO" ? maskApplicationNumber(request.value) : null,
      checkedAt,
      fallbackAction: null,
      investorName: null,
      ipoName: "Selected IPO",
      message: "IPO was not found for allotment checking.",
      panMasked: request.checkType === "PAN" ? maskPAN(request.value) : null,
      source: "IPO Lens",
      sourceUrl: null,
      status: "ERROR",
    };
  }

  const provider = providers[request.registrar] ?? providers.BSE;
  const fallback = officialLinkFor(request.registrar as AllotmentRegistrar);
  const response = await provider.check({ ...request, ipo });

  return maskResponse(request, {
    ...response,
    fallbackAction: response.fallbackAction ?? (response.status === "UNAVAILABLE" ? { label: fallback.label, url: fallback.url } : null),
  });
}
