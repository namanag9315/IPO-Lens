import { describe, expect, it } from "vitest";
import {
  deriveIPOPlatformSiblingUrls,
  parseIPOPlatformBasePage,
  parseIPOPlatformFinancialReportPage,
  parseIPOPlatformPeerComparisonPage,
  parseIPOPlatformSubscriptionPage,
  parseIPOPlatformReviewPage,
  parseIPOPlatformDetail,
} from "@/lib/ipo-engine-clean/providers/ipoPlatformProvider";
import { detectIPOPageContent } from "@/lib/ipo-engine-clean/detectSourceContent";

describe("deriveIPOPlatformSiblingUrls", () => {
  it("derives all sibling URLs from valid base URL", () => {
    const baseUrl = "https://www.ipoplatform.com/ipo/susan-electricals-india-ipo/4595";
    const result = deriveIPOPlatformSiblingUrls(baseUrl);
    expect(result).toEqual({
      base: "https://www.ipoplatform.com/ipo/susan-electricals-india-ipo/4595",
      financialReport: "https://www.ipoplatform.com/ipo/financial-report/susan-electricals-india-ipo/4595",
      peerComparison: "https://www.ipoplatform.com/ipo/peer-comparison/susan-electricals-india-ipo/4595",
      subscription: "https://www.ipoplatform.com/ipo/subscription/susan-electricals-india-ipo/4595",
      review: "https://www.ipoplatform.com/ipo/review/susan-electricals-india-ipo/4595",
    });
  });

  it("returns no_source_url_for_ipoplatform for invalid URLs", () => {
    const result = deriveIPOPlatformSiblingUrls("https://www.chittorgarh.com/ipo/susan-electricals/123");
    expect(result).toBe("no_source_url_for_ipoplatform");
  });
});

describe("detectIPOPageContent for IPOPlatform", () => {
  it("accepts valid page with at least 3 markers", () => {
    const html = `
      <h1>Susan Electricals IPO Details</h1>
      <div>Here is the Object of Issue for the company.</div>
      <div>Our Lead Manager is merchant bank.</div>
    `;
    const detection = detectIPOPageContent({
      html,
      ipoName: "Susan Electricals",
      provider: "IPOPLATFORM",
      text: html,
    });
    expect(detection.isValidIPOPage).toBe(true);
  });

  it("rejects page with insufficient markers", () => {
    const html = `
      <h1>Welcome to IPOPlatform</h1>
      <p>Login to view more details.</p>
    `;
    const detection = detectIPOPageContent({
      html,
      ipoName: "Susan Electricals",
      provider: "IPOPLATFORM",
      text: html,
    });
    expect(detection.isValidIPOPage).toBe(false);
  });
});

describe("parseIPOPlatformBasePage", () => {
  it("extracts details and company text from base page", () => {
    const html = `
      <h1>Susan Electricals India Limited</h1>
      <div>
        <p>Price Band: Rs 120 to Rs 125 per share</p>
        <p>Face Value: Rs 10</p>
        <p>Lot Size: 1000 shares</p>
        <p>Open Date: June 14, 2026</p>
        <p>Close Date: June 16, 2026</p>
        <p>Registrar: Bigshare Services Private Limited</p>
        <p>Lead Manager: Capital Markets Limited</p>
      </div>
      <h2>About the Company</h2>
      <p>Susan Electricals India Limited is engaged in the manufacturing of electrical components and appliances. The company has multiple manufacturing facilities in India.</p>
      <h2>Object of the Issue</h2>
      <p>Funding working capital requirements and general corporate purposes.</p>
    `;
    const result = parseIPOPlatformBasePage(html, "Susan Electricals");
    const factKeys = result.facts.map(f => f.factKey);
    expect(factKeys).toContain("price_band");
    expect(factKeys).toContain("price_band_low");
    expect(factKeys).toContain("price_band_high");
    expect(factKeys).toContain("face_value");
    expect(factKeys).toContain("lot_size");
    expect(factKeys).toContain("registrar_name");
    expect(factKeys).toContain("lead_manager_name");
    expect(factKeys).toContain("company_description");
    expect(factKeys).toContain("objects_of_issue");
  });
});

describe("parseIPOPlatformFinancialReportPage", () => {
  it("extracts financials from table and calculates margin/growth", () => {
    const html = `
      <h2>Financial Performance</h2>
      <table>
        <tr>
          <th>Particulars</th>
          <th>31-Mar-2024</th>
          <th>31-Mar-2025</th>
        </tr>
        <tr>
          <td>Revenue</td>
          <td>100.00</td>
          <td>150.00</td>
        </tr>
        <tr>
          <td>Profit After Tax (PAT)</td>
          <td>10.00</td>
          <td>18.00</td>
        </tr>
        <tr>
          <td>Total Assets</td>
          <td>80.00</td>
          <td>120.00</td>
        </tr>
      </table>
    `;
    const result = parseIPOPlatformFinancialReportPage(html, "Susan Electricals");
    const facts = result.facts;
    const findFact = (key: string) => facts.find(f => f.factKey === key)?.factValue;

    expect(findFact("revenue_latest")).toBe(150);
    expect(findFact("pat_latest")).toBe(18);
    expect(findFact("assets_latest")).toBe(120);
    expect(findFact("revenue_growth")).toBe(50); // (150-100)/100 * 100
    expect(findFact("pat_growth")).toBe(80); // (18-10)/10 * 100
    expect(findFact("pat_margin_latest")).toBe(12); // 18/150 * 100
  });

  it("extracts financials from generic table layout with td tags", () => {
    const html = `
      <h2>Financial Performance</h2>
      <table>
        <tr>
          <td>Particulars</td>
          <td>31-Mar-2024</td>
          <td>31-Mar-2025</td>
        </tr>
        <tr>
          <td>Revenue</td>
          <td>100.00</td>
          <td>150.00</td>
        </tr>
        <tr>
          <td>Profit After Tax (PAT)</td>
          <td>10.00</td>
          <td>18.00</td>
        </tr>
        <tr>
          <td>Total Assets</td>
          <td>80.00</td>
          <td>120.00</td>
        </tr>
      </table>
    `;
    const result = parseIPOPlatformFinancialReportPage(html, "Susan Electricals");
    const facts = result.facts;
    const findFact = (key: string) => facts.find(f => f.factKey === key)?.factValue;

    expect(findFact("revenue_latest")).toBe(150);
    expect(findFact("pat_latest")).toBe(18);
    expect(findFact("assets_latest")).toBe(120);
    expect(findFact("revenue_growth")).toBe(50);
    expect(findFact("pat_growth")).toBe(80);
    expect(findFact("pat_margin_latest")).toBe(12);
  });
});

describe("parseIPOPlatformPeerComparisonPage", () => {
  it("extracts peer comparison table and calculates averages/highs", () => {
    const html = `
      <h2>Peer Comparison</h2>
      <table>
        <tr>
          <th>Company Name</th>
          <th>P/E</th>
          <th>EPS</th>
          <th>RoNW (%)</th>
        </tr>
        <tr>
          <td>Susan Electricals India Limited</td>
          <td>15.00</td>
          <td>8.00</td>
          <td>20.00</td>
        </tr>
        <tr>
          <td>Peer A Limited</td>
          <td>25.00</td>
          <td>6.00</td>
          <td>15.00</td>
        </tr>
        <tr>
          <td>Peer B Limited</td>
          <td>35.00</td>
          <td>12.00</td>
          <td>18.00</td>
        </tr>
      </table>
    `;
    const result = parseIPOPlatformPeerComparisonPage(html, "Susan Electricals");
    const facts = result.facts;
    const findFact = (key: string) => facts.find(f => f.factKey === key)?.factValue;

    expect(findFact("ipo_pe")).toBe(15);
    expect(findFact("ipo_eps")).toBe(8);
    expect(findFact("roe_latest")).toBe(20);
    expect(findFact("peer_average_pe")).toBe(30); // (25 + 35) / 2
    expect(findFact("peer_high_pe")).toBe(35);
  });
});

describe("parseIPOPlatformSubscriptionPage", () => {
  it("extracts subscription times", () => {
    const html = `
      <h2>Subscription Details</h2>
      <table>
        <tr>
          <th>Category</th>
          <th>Times Subscribed</th>
        </tr>
        <tr>
          <td>QIB</td>
          <td>5.50</td>
        </tr>
        <tr>
          <td>NII</td>
          <td>10.20</td>
        </tr>
        <tr>
          <td>Retail</td>
          <td>2.40</td>
        </tr>
        <tr>
          <td>Total</td>
          <td>4.80</td>
        </tr>
      </table>
    `;
    const result = parseIPOPlatformSubscriptionPage(html, "Susan Electricals");
    const facts = result.facts;
    const findFact = (key: string) => facts.find(f => f.factKey === key)?.factValue;

    expect(findFact("qib_subscription")).toBe(5.5);
    expect(findFact("nii_subscription")).toBe(10.2);
    expect(findFact("retail_subscription")).toBe(2.4);
    expect(findFact("total_subscription")).toBe(4.8);
  });

  it("extracts subscription times from generic table layout with td tags", () => {
    const html = `
      <h2>Subscription Details</h2>
      <table>
        <tr>
          <td>Category</td>
          <td>Times Subscribed</td>
        </tr>
        <tr>
          <td>QIB</td>
          <td>5.50</td>
        </tr>
        <tr>
          <td>NII</td>
          <td>10.20</td>
        </tr>
        <tr>
          <td>Retail</td>
          <td>2.40</td>
        </tr>
        <tr>
          <td>Total</td>
          <td>4.80</td>
        </tr>
      </table>
    `;
    const result = parseIPOPlatformSubscriptionPage(html, "Susan Electricals");
    const facts = result.facts;
    const findFact = (key: string) => facts.find(f => f.factKey === key)?.factValue;

    expect(findFact("qib_subscription")).toBe(5.5);
    expect(findFact("nii_subscription")).toBe(10.2);
    expect(findFact("retail_subscription")).toBe(2.4);
    expect(findFact("total_subscription")).toBe(4.8);
  });
});

describe("parseIPOPlatformDetail combined", () => {
  it("merges all sibling pages successfully", () => {
    const baseHtml = `
      <h1>Susan Electricals</h1>
      <p>Price Band: Rs 120 to Rs 125</p>
    `;
    const peerComparison = `
      <table>
        <tr><th>Company Name</th><th>P/E</th></tr>
        <tr><td>Susan Electricals</td><td>15.0</td></tr>
      </table>
    `;
    const result = parseIPOPlatformDetail({
      baseHtml,
      siblingHtmls: {
        peerComparison,
      },
      ipoName: "Susan Electricals",
      baseUrl: "https://www.ipoplatform.com/ipo/susan-electricals-india-ipo/4595",
    });
    const factKeys = result.facts.map(f => f.factKey);
    expect(factKeys).toContain("price_band");
    expect(factKeys).toContain("ipo_pe");
  });
});
