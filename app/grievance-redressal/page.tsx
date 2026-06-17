import Link from "next/link";

export const metadata = {
  title: "Grievance Redressal — IPO Lens",
  description: "Learn how to file complaints regarding data accuracy, privacy, AI summaries, or platform security with our Grievance Officer.",
};

export default function GrievanceRedressalPage() {
  const lastUpdated = "June 17, 2026";

  return (
    <main style={{ padding: "48px 24px 72px" }}>
      <div className="shell" style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        <header style={{ marginBottom: "32px", borderBottom: "1px solid var(--line)", paddingBottom: "20px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: "var(--ink)", letterSpacing: "-0.04em", lineHeight: "1.15" }}>Grievance Redressal</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>Last Updated: {lastUpdated}</p>
        </header>

        <article style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text)", display: "grid", gap: "24px" }}>
          <p>
            At IPO Lens, we build tools to make complex public financial data accessible and easy to digest for retail investors. We are committed to addressing any user concerns or grievances regarding our platform in a fair, transparent, and timely manner.
          </p>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>1. Scope of Grievances</h2>
            <p>
              You may submit a complaint or grievance if you encounter issues regarding:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li><strong>Data Accuracy:</strong> Misleading, incorrect, or outdated numbers, issue dates, or allotment status details.</li>
              <li><strong>AI-Generated Summaries:</strong> Inaccuracies or context errors in our plain-English company breakdowns.</li>
              <li><strong>Privacy & Consent:</strong> Concerns about personal digital data collection, deletion, or cookie options under the DPDP Act, 2023.</li>
              <li><strong>Security:</strong> System vulnerabilities, unauthorized access attempts, or phishing activities.</li>
              <li><strong>Intellectual Property:</strong> Concerns regarding branding, scraper tools, or copyrighted text.</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>2. Grievance Officer Contact Details</h2>
            <p>
              In compliance with the Information Technology Act, 2000 and Digital Personal Data Protection Act, 2023, the contact details of our designated Grievance Officer are listed below:
            </p>
            
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", padding: "20px", borderRadius: "8px", fontSize: "14px", display: "grid", gap: "8px" }}>
              <div><strong>Designation:</strong> Grievance Redressal Officer</div>
              <div><strong>Email:</strong> <a href="mailto:grievance@ipolens.in" style={{ color: "var(--blue)" }}>grievance@ipolens.in</a></div>
              <div><strong>Address:</strong> Mumbai, Maharashtra, India</div>
              <div><strong>Working Hours:</strong> Monday to Friday, 10:00 AM to 6:00 PM IST (excluding national holidays)</div>
            </div>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>3. Information to Include in Your Submission</h2>
            <p>
              To help us investigate and resolve your complaint efficiently, please include the following details:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li>Your Full Name and registered email address.</li>
              <li>The specific URL, page, or IPO card concerned.</li>
              <li>A clear description of the issue (e.g., specific cell showing incorrect subscription numbers).</li>
              <li>Official source links (SEBI, BSE, NSE, Registrar) showing the correct parameters.</li>
              <li>A screenshot or screen recording of the error, if applicable.</li>
            </ul>
            <p>
              <em>Note: For privacy or data access requests, please use the subject line: <strong>&quot;Privacy Request — DPDP&quot;</strong>.</em>
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>4. Redressal Timeline</h2>
            <p>
              We adhere to strict regulatory and consumer safety timelines:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li><strong>Acknowledgment:</strong> We will acknowledge your grievance ticket within <strong>48 hours</strong> of receipt.</li>
              <li><strong>Resolution:</strong> We aim to investigate and resolve all valid complaints within <strong>30 days (1 month)</strong>. If a request is highly complex, we will communicate the extension timeline to you.</li>
            </ul>
          </section>

        </article>
      </div>
    </main>
  );
}
