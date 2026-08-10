import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseIPOPremiumDetailPage } from '../../lib/providers/ipoPremiumDetailProvider';

describe('ipoPremiumDetailProvider', () => {
  it('should correctly parse all 13 sections from the Susan Electricals fixture', () => {
    const htmlPath = path.join(__dirname, '../fixtures/susan_electricals.html');
    const html = fs.readFileSync(htmlPath, 'utf8');

    const parsed = parseIPOPremiumDetailPage({ html });

    // 1. About Company
    expect(parsed.companyProfile?.description).toContain('Susan Electricals India Limited is engaged in the manufacturing');

    // 2. IPO Details
    expect(parsed.ipoDetails?.totalIssueSize).toBe(25.00);
    expect(parsed.ipoDetails?.freshIssue).toBe(20.00);
    expect(parsed.ipoDetails?.offerForSale).toBe(5.00);
    expect(parsed.ipoDetails?.faceValue).toBe(10);
    expect(parsed.ipoDetails?.issueType).toBe('Book Built Issue');
    expect(parsed.ipoDetails?.listingAt).toBe('NSE SME');
    expect(parsed.ipoDetails?.preIssueShares).toBe(10000000);
    expect(parsed.ipoDetails?.postIssueShares).toBe(15000000);

    // 3. Subscription
    expect(parsed.subscription?.rows).toHaveLength(3);
    expect(parsed.subscription?.rows[0]).toMatchObject({ category: 'QIB', offered: 1000000, applied: 50000000, times: 50 });

    // 4. Application-Wise Breakup
    expect(parsed.applicationBreakup).toHaveLength(2);
    expect(parsed.applicationBreakup?.[0]).toMatchObject({ category: 'Retail', reserved: 10000, applied: 500000, times: 50 });

    // 5. Lot(s) Distribution
    expect(parsed.lotDistribution).toHaveLength(2);
    expect(parsed.lotDistribution?.[0]).toMatchObject({ category: 'Retail Minimum', lots: 1, quantity: 1000, amount: 100000, reserved: 50 });

    // 6. Reservation
    expect(parsed.reservation).toHaveLength(3);
    expect(parsed.reservation?.[0]).toMatchObject({ category: 'QIB', sharesOffered: 1000000, percentage: 50 });

    // 7. KPIs
    expect(parsed.kpis).toHaveLength(2);
    expect(parsed.kpis?.[0].name).toBe('ROE');
    expect(parsed.kpis?.[0].periods['31-Mar-26']).toBe('15.5%');

    // 8. Financials
    expect(parsed.financials).toHaveLength(2);
    expect(parsed.financials?.[0]).toMatchObject({
      period: '31-Mar-26', assets: 150, totalIncome: 200, pat: 25, ebitda: 40, netWorth: 80, reserves: 50, borrowings: 30
    });

    // 9. Peer Comparison
    expect(parsed.peerValuation).toHaveLength(4);
    expect(parsed.peerValuation?.[0]).toMatchObject({
      company: 'Susan Electricals', pe: 15, cmp: 100, faceValue: 10, ronw: 15.5, epsBasic: 5
    });

    // 10. Strengths and Risks
    expect(parsed.strengths).toHaveLength(2);
    expect(parsed.strengths?.[0].title).toBe('Strong Market Position:');

    expect(parsed.risks).toHaveLength(2);
    expect(parsed.risks?.[0].title).toBe('Raw Material Price Volatility:');
    expect(parsed.risks?.[0].severity).toBe('High');

    // 11. Lead Manager
    expect(parsed.leadManager?.name).toBe('Seren Capital Private Limited');

    // 12. Registrar
    expect(parsed.registrar?.name).toBe('Mudra RTA Ventures Private Limited');
    expect(parsed.registrar?.phone).toBe('+91 11 2233 4455');
    expect(parsed.registrar?.email).toBe('info@mudrarta.com');
    expect(parsed.registrar?.website).toBe('www.mudrarta.com');
    expect(parsed.registrar?.address).toBe('123, Financial Hub, Mumbai');

    // 13. Market Maker
    expect(parsed.ipoDetails?.marketMakerName).toBe('Mansi Share & Stock Broking Private Limited');
    expect(parsed.ipoDetails?.marketMakerReservedShares).toBe(458000);
    expect(parsed.ipoDetails?.marketMakerReservedAmount).toBe(5.82);
  });
});
