export interface TextFallbackData {
  companyProfile?: {
    description?: string;
    productsServices?: string;
    customers?: string;
    sectorSuggestion?: string;
  };
  leadManager?: { name: string };
  registrar?: {
    name: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  marketMaker?: {
    name: string;
    reservedShares?: number | null;
    reservedAmount?: number | null;
  };
}

function cleanNumericValue(val: string): number | null {
  if (!val || val.trim() === '' || val.trim() === '-') return null;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function parseIPOPremiumFromText(rawText: string): TextFallbackData {
  const data: TextFallbackData = {};
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let inAboutCompany = false;
  let aboutCompanyText: string[] = [];
  let inLeadManager = false;
  let inRegistrar = false;
  let inMarketMaker = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Reset state if we hit a known marker
    if (
      lowerLine.includes('strength') ||
      lowerLine.includes('risk factors') ||
      lowerLine.includes('lead manager') ||
      lowerLine.includes('registrar') ||
      lowerLine.includes('market maker') ||
      lowerLine.includes('allotment status') ||
      lowerLine.includes('subscription status') ||
      lowerLine.includes('peer comparison') ||
      lowerLine.includes('company financial') ||
      lowerLine.includes('disclaimer') ||
      lowerLine.includes('application-wise breakup') ||
      lowerLine.includes('lot(s) distribution') ||
      lowerLine.includes('reservation') ||
      lowerLine.includes('ipo details') ||
      lowerLine.includes('key performance indicators')
    ) {
      inAboutCompany = false;
    }

    if (inAboutCompany) {
      aboutCompanyText.push(line);
      continue;
    }

    if (lowerLine === 'about company' || lowerLine === 'about the company') {
      inAboutCompany = true;
      continue;
    }

    if (lowerLine.includes('lead manager') || lowerLine.includes('lead manager(s)')) {
      // Find the next meaningful line
      if (i + 1 < lines.length) {
        let nextLine = lines[i + 1];
        if (nextLine.length > 3 && !nextLine.toLowerCase().includes('lead manager')) {
          data.leadManager = { name: nextLine };
        }
      }
      continue;
    }

    if (lowerLine === 'registrar' || lowerLine.includes('registrar to the issue')) {
      inRegistrar = true;
      data.registrar = { name: '' };
      continue;
    }

    if (inRegistrar) {
      if (!data.registrar!.name) {
        data.registrar!.name = line;
        continue;
      } else if (lowerLine.includes('phone:')) {
        data.registrar!.phone = line.split(/phone:/i)[1]?.trim();
        continue;
      } else if (lowerLine.includes('email:')) {
        data.registrar!.email = line.split(/email:/i)[1]?.trim();
        continue;
      } else if (lowerLine.includes('website:')) {
        data.registrar!.website = line.split(/website:/i)[1]?.trim();
        continue;
      } else if (lowerLine.includes('address:')) {
        data.registrar!.address = line.split(/address:/i)[1]?.trim();
        continue;
      } else if (lowerLine.includes('market maker') || lowerLine.includes('lead manager')) {
        inRegistrar = false;
      } else {
        continue;
      }
    }

    if (lowerLine === 'market maker' || lowerLine.includes('reserved for market maker')) {
      inMarketMaker = true;
      if (!data.marketMaker) data.marketMaker = { name: '' };
      continue;
    }

    if (inMarketMaker) {
      if (lowerLine.includes('reserved shares:')) {
        data.marketMaker!.reservedShares = cleanNumericValue(line.split(/reserved shares:/i)[1]);
        continue;
      } else if (lowerLine.includes('reserved amount:')) {
        data.marketMaker!.reservedAmount = cleanNumericValue(line.split(/reserved amount:/i)[1]);
        continue;
      } else if (!data.marketMaker!.name && line.length > 3 && !lowerLine.includes('shares') && !lowerLine.includes('amount')) {
        data.marketMaker!.name = line;
        continue;
      } else if (
        lowerLine.includes('strength') ||
        lowerLine.includes('risk factors') ||
        lowerLine.includes('lead manager') ||
        lowerLine.includes('registrar') ||
        lowerLine.includes('allotment status') ||
        lowerLine.includes('subscription status') ||
        lowerLine.includes('peer comparison') ||
        lowerLine.includes('company financial') ||
        lowerLine.includes('disclaimer')
      ) {
        inMarketMaker = false;
      } else {
        continue;
      }
    }

    // Single-line extracts for Market Maker in IPO details table fallback
    if (lowerLine.includes('market maker') && lowerLine.includes(':')) {
       // "Market Maker: Mansi Share"
       const parts = line.split(':');
       if (parts.length > 1 && parts[1].trim()) {
         if (!data.marketMaker) data.marketMaker = { name: parts[1].trim() };
         else if (!data.marketMaker.name) data.marketMaker.name = parts[1].trim();
       }
    }
  }

  if (aboutCompanyText.length > 0) {
    const description = aboutCompanyText.join('\n');
    const lowerDesc = description.toLowerCase();

    data.companyProfile = { description };

    // Derive products
    if (lowerDesc.includes('winding wires') || lowerDesc.includes('conductors') || lowerDesc.includes('power cables') || lowerDesc.includes('aluminium and copper')) {
      data.companyProfile.productsServices = "winding wires, conductors, power cables, and other electrical products";
    }

    // Derive customers
    if (lowerDesc.includes('discom') || lowerDesc.includes('epc contractor') || lowerDesc.includes('infrastructure compan')) {
      data.companyProfile.customers = "DISCOMs, EPC contractors, and infrastructure companies";
    }

    // Derive sector suggestion
    if (lowerDesc.includes('winding wires') || lowerDesc.includes('conductors') || lowerDesc.includes('power cables') || lowerDesc.includes('electrical product')) {
      data.companyProfile.sectorSuggestion = "Electrical equipment / wires and cables";
    }
  }

  // Final cleanup for nested text that might be empty
  if (data.registrar && !data.registrar.name) delete data.registrar;
  if (data.leadManager && !data.leadManager.name) delete data.leadManager;
  if (data.marketMaker && !data.marketMaker.name && !data.marketMaker.reservedShares) delete data.marketMaker;

  return data;
}
