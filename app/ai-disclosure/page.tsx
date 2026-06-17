import Link from "next/link";

export const metadata = {
  title: "AI Disclosure Policy — IPO Lens",
  description: "Learn how artificial intelligence is used to summarize IPO documents, its limitations, and compliance guidelines.",
};

export default function AIDisclosurePage() {
  const lastUpdated = "June 17, 2026";

  return (
    <main style={{ padding: "48px 24px 72px" }}>
      <div className="shell" style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        <header style={{ marginBottom: "32px", borderBottom: "1px solid var(--line)", paddingBottom: "20px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: "var(--ink)", letterSpacing: "-0.04em", lineHeight: "1.15" }}>AI Disclosure Policy</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>Last Updated: {lastUpdated}</p>
        </header>

        <article style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text)", display: "grid", gap: "24px" }}>
          <p>
            IPO Lens uses artificial intelligence (AI) systems to improve readability, summarize complex documents, extract structural fields, and answer user questions in simple English. This policy explains how we use AI, our methodologies, and the limitations of these technologies.
          </p>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>1. How AI Is Used</h2>
            <p>
              AI may be used to extract, parse, or summarize the following categories of IPO-related information:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li><strong>Company & Business Descriptions:</strong> Summarizing what the company does, its core products, and business segments.</li>
              <li><strong>Objects of the Issue:</strong> Clarifying how the company intends to spend the IPO proceeds (e.g., debt repayment, capital expenditure, general corporate purposes).</li>
              <li><strong>Risk Factors:</strong> Summarizing primary internal and external risk factors detailed in the offer documents.</li>
              <li><strong>Promoter & Key Manager Information:</strong> Extracting names, designations, and background context.</li>
              <li><strong>Intermediaries:</strong> Identifying Lead Managers, Registrars, and Anchor Investors where available.</li>
              <li><strong>Interactive Q&A:</strong> Assisting users in querying publicly available data about IPO filings in plain English.</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>2. Source-Grounded AI</h2>
            <p>
              IPO Lens operates on a <strong>source-grounded retrieval model</strong>. The AI summaries and answers are strictly generated from publicly available official documents, including:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li>Draft Red Herring Prospectuses (DRHP) and Red Herring Prospectuses (RHP)</li>
              <li>Final Prospectus and official stock exchange filings</li>
              <li>Registrar disclosures and SEBI public registries</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>3. AI Limitations and Risks</h2>
            <p>
              Generative AI models, while powerful, are subject to logical and contextual limitations. You must keep in mind that:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li>AI may misinterpret complex legal or financial terminology.</li>
              <li>AI may omit crucial contextual points or risk disclosures from the primary document.</li>
              <li>AI may extract outdated parameters if newer filings or corrigendums are published.</li>
              <li>AI may occasionally introduce factual errors or hallucinations if public documents are poorly formatted.</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>4. Not Investment Advice</h2>
            <p>
              <strong>AI-generated summaries and responses are not investment advice, stock recommendations, or personalized financial planning.</strong> IPO Lens does not offer advisory services. The summaries are intended purely for educational review and retail investor awareness.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>5. Verification and User Responsibility</h2>
            <p>
              You are solely responsible for your investment decisions. You should not rely exclusively on AI-generated summaries to make financial decisions. Always verify critical figures, dates, and terms from the official SEBI filings and the RHP before applying for any IPO.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>6. Safeguards and Review Workflows</h2>
            <p>
              We implement several guardrails to ensure information reliability:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "8px" }}>
              <li><strong>Confidence Scoring:</strong> Flagging pages and sections where data parsing meets lower confidence indicators.</li>
              <li><strong>Source Link Mapping:</strong> Providing direct links to original documents where possible so users can compare.</li>
              <li><strong>Error Logging:</strong> Periodically auditing system outputs and refining the prompt pipelines.</li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>7. Reporting Errors</h2>
            <p>
              If you identify an error, mismatch, or misleading statement in our AI-generated summaries, please let us know immediately. You can report errors by emailing us at <a href="mailto:support@ipolens.in" style={{ color: "var(--blue)" }}>support@ipolens.in</a>. We will review and correct the output within a reasonable timeframe.
            </p>
          </section>

        </article>
      </div>
    </main>
  );
}
