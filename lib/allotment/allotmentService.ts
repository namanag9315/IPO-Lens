import { AllotmentCheckRequest, AllotmentResult, Registrar } from "./types";
import { mockProvider } from "./providers/mockProvider";
import { kfintechProvider } from "./providers/kfintechProvider";
import { mufgIntimeProvider } from "./providers/mufgIntimeProvider";
import { bigshareProvider } from "./providers/bigshareProvider";
import { bseProvider } from "./providers/bseProvider";
import { nseProvider } from "./providers/nseProvider";

export async function checkAllotment(request: AllotmentCheckRequest): Promise<AllotmentResult> {
  const providerMap: Record<Registrar, typeof mockProvider> = {
    MOCK: mockProvider,
    KFINTECH: kfintechProvider,
    MUFG_INTIME: mufgIntimeProvider,
    BIGSHARE: bigshareProvider,
    BSE: bseProvider,
    NSE: nseProvider,
  };

  const provider = providerMap[request.registrar];
  if (!provider) {
    throw new Error(`No provider configured for registrar: ${request.registrar}`);
  }

  return provider.checkAllotment(request);
}
