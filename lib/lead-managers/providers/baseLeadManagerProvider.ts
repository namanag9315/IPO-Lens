import type { LeadManagerImportResult } from "@/lib/lead-managers/types";

export interface LeadManagerProviderInput {
  leadManagerId?: string | null;
  sourceUrl: string;
}

export interface LeadManagerProvider {
  key: string;
  name: string;
  fetch(input: LeadManagerProviderInput): Promise<LeadManagerImportResult>;
}
