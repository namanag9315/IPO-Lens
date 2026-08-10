import type { AllotmentCheckRequest, AllotmentCheckResponse, AllotmentIPOOption, AllotmentRegistrar } from "@/lib/allotment/types";

export interface ProviderCheckInput extends AllotmentCheckRequest {
  ipo: Pick<AllotmentIPOOption, "id" | "name" | "slug" | "registrar">;
}

export interface AllotmentProvider {
  name: AllotmentRegistrar;
  isEnabled(): boolean;
  check(input: ProviderCheckInput): Promise<AllotmentCheckResponse>;
}
