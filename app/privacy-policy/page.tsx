import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — IPO Lens",
  description: "Understand how IPO Lens collects, processes, and protects your personal digital data under Indian laws.",
};

export default function PrivacyPolicy() {
  const lastUpdated = "June 17, 2026";
  
  return (
    <main style={{ padding: "48px 24px 72px" }}>
      <div className="shell" style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        <header style={{ marginBottom: "32px", borderBottom: "1px solid var(--line)", paddingBottom: "20px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: "var(--ink)", letterSpacing: "-0.04em", lineHeight: "1.15" }}>Privacy Policy</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>Last Updated: {lastUpdated}</p>
        </header>

        <article style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text)", display: "grid", gap: "24px" }}>
          <p>
            This Privacy Policy explains how IPO Lens (“IPO Lens”, “we”, “us”, or “our”) collects, uses, stores, shares and protects personal data when you access or use our website, dashboards, alerts, research tools, AI summaries, watchlists, newsletters or any related services.
          </p>
          <p>
            By using IPO Lens, you agree to the collection and use of information in accordance with this Privacy Policy.
          </p>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>1. About IPO Lens</h2>
            <p>
              IPO Lens is an IPO information and research platform that helps users view public IPO-related information, including issue details, GMP trends, subscription data, financial summaries, valuation metrics, risk summaries, AI-generated explanations and rule-based IPO research scores.
            </p>
            <p>
              IPO Lens is intended for informational and educational purposes only. We are not SEBI-registered and do not provide personalised investment advice, portfolio management services, stock broking services, merchant banking services, investment advisory services or securities dealing services.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>2. Personal Data We Collect</h2>
            <p>We may collect the following categories of personal data:</p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li><strong>Account Information:</strong> Name, email address, mobile number (if provided), login credentials or authentication identifiers, and profile preferences.</li>
              <li><strong>Usage Information:</strong> Pages visited, IPOs viewed, search queries, watchlist activity, clicks, filters, interactions, AI Q&A usage, and alert preferences.</li>
              <li><strong>Device and Technical Information:</strong> IP address, browser type, device type, operating system, referring URL, session data, cookies and similar identifiers, and approximate location derived from IP address.</li>
              <li><strong>Communication Information:</strong> Newsletter subscription status, support requests, feedback, grievance submissions, and email interaction data.</li>
              <li><strong>Payment Information:</strong> If we introduce paid services, payment information may be processed by third-party payment gateways. IPO Lens will not store complete card numbers, UPI credentials, or banking passwords.</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>3. Personal Data We Do Not Intentionally Collect</h2>
            <p>IPO Lens does not intentionally collect:</p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li>PAN numbers or Aadhaar numbers</li>
              <li>Demat account credentials or trading account passwords</li>
              <li>Bank account login credentials or sensitive personal financial documents</li>
              <li>Biometric information, health information, or children’s data knowingly</li>
            </ul>
            <p>If any such information is accidentally submitted by a user, we will delete or mask it where reasonably possible.</p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>4. Purpose of Processing</h2>
            <p>We process personal data for the following purposes:</p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li>To create and manage user accounts and provide watchlist and alert services</li>
              <li>To personalise the user experience and send newsletters or IPO alerts</li>
              <li>To improve website performance, product features, and analyse platform usage</li>
              <li>To provide customer support and maintain security against misuse</li>
              <li>To comply with applicable law, regulatory requests, or legal obligations</li>
              <li>To improve AI summaries, scoring explainability, and product quality</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>5. Legal Basis and Consent</h2>
            <p>
              Where required under applicable Indian data protection law, including the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>, we process personal data based on user consent or for lawful purposes. The DPDP Act provides a framework for processing digital personal data for lawful purposes while recognising user rights over personal data.
            </p>
            <p>
              By using IPO Lens, creating an account, subscribing to alerts, submitting forms, or continuing to use the platform after being shown relevant notices, you consent to the processing of your personal data as described in this Privacy Policy.
            </p>
            <p>
              You may withdraw consent for optional communications or non-essential processing by using unsubscribe links, account settings, or by contacting us at <a href="mailto:privacy@ipolens.in" style={{ color: "var(--blue)" }}>privacy@ipolens.in</a>.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>6. Use of AI and Automated Processing</h2>
            <p>IPO Lens may use artificial intelligence systems to:</p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li>Summarise publicly available IPO documents</li>
              <li>Extract company descriptions, objects of issue, risk factors, promoters, lead managers, registrar and other IPO-related information</li>
              <li>Generate plain-English educational explanations and answer questions about publicly available IPO data</li>
            </ul>
            <p>
              AI-generated information may be inaccurate, incomplete or outdated. We use safeguards such as source mapping, evidence checks and confidence indicators, but users must independently verify important details from official documents (DRHP, RHP, prospectus, stock exchange filings, SEBI filings).
            </p>
            <p>IPO Lens does not use AI outputs as personalised investment advice.</p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>7. Data Sources</h2>
            <p>
              We process publicly available IPO-related data from sources such as SEBI public issue filings, stock exchange filings, registrar sites, and issuer company portals. We do not claim ownership over third-party data. Data is compiled for research, educational presentation, and investor awareness.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>8. Sharing of Personal Data</h2>
            <p>
              We may share personal data with cloud hosting providers, storage providers, analytics tools, and legal/regulatory authorities where required under law. <strong>We do not sell personal data to advertisers.</strong>
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>9. User Rights</h2>
            <p>
              Under applicable Indian regulations, you have the right to access, correct, delete your personal data, or nominate an individual in the event of incapacity. Send all requests to <a href="mailto:privacy@ipolens.in" style={{ color: "var(--blue)" }}>privacy@ipolens.in</a>.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>10. Grievance Redressal</h2>
            <p>
              In accordance with local intermediary guidelines, any privacy concerns or grievances can be escalated to our Grievance Officer:
            </p>
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", padding: "16px", borderRadius: "8px", fontSize: "13px" }}>
              <strong>Grievance Officer:</strong> Data Protection Cell<br />
              <strong>Contact Email:</strong> <a href="mailto:grievance@ipolens.in" style={{ color: "var(--blue)" }}>grievance@ipolens.in</a><br />
              <strong>Address:</strong> Mumbai, Maharashtra, India
            </div>
          </section>

        </article>
      </div>
    </main>
  );
}
