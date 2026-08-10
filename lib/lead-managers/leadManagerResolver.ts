import { fetchIPOPremiumLeadManagerDirectory } from "@/lib/lead-managers/providers/ipoPremiumLeadManagerProvider";
import { leadManagerSlug, normalizeLeadManagerName } from "@/lib/lead-managers/normalizeLeadManagerName";
import { supabaseAdmin } from "@/lib/supabase";

export interface LeadManagerResolvedUrl {
  confidence: "high" | "medium" | "low";
  source: string;
  url: string;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function resolveLeadManagerProfileUrl(name: string): Promise<LeadManagerResolvedUrl | null> {
  const slug = leadManagerSlug(name);

  const { data: local } = await supabaseAdmin
    .from("lead_managers")
    .select("source_url, lead_manager_profile_url")
    .eq("slug", slug)
    .maybeSingle();

  const localUrl = asString(local?.lead_manager_profile_url) ?? asString(local?.source_url);
  if (localUrl) {
    return {
      confidence: "high",
      source: "local_lead_manager_record",
      url: localUrl,
    };
  }

  try {
    const target = normalizeLeadManagerName(name);
    const directory = await fetchIPOPremiumLeadManagerDirectory(50);
    const match = directory.find((entry) => normalizeLeadManagerName(entry.name) === target);

    if (match) {
      return {
        confidence: "medium",
        source: "IPO_PREMIUM_DIRECTORY",
        url: match.sourceUrl,
      };
    }
  } catch {
    // Resolver failure should send the discovery to admin review rather than guessing.
  }

  return null;
}
