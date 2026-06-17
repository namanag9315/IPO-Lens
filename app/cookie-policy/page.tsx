import Link from "next/link";

export const metadata = {
  title: "Cookie Policy — IPO Lens",
  description: "Read our Cookie Policy to understand how we use cookies and tracking technologies to improve our services.",
};

export default function CookiePolicyPage() {
  const lastUpdated = "June 17, 2026";

  return (
    <main style={{ padding: "48px 24px 72px" }}>
      <div className="shell" style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        <header style={{ marginBottom: "32px", borderBottom: "1px solid var(--line)", paddingBottom: "20px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: "900", color: "var(--ink)", letterSpacing: "-0.04em", lineHeight: "1.15" }}>Cookie Policy</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", marginTop: "8px" }}>Last Updated: {lastUpdated}</p>
        </header>

        <article style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text)", display: "grid", gap: "24px" }}>
          <p>
            IPO Lens (“we”, “us”, or “our”) uses cookies and similar tracking technologies to enhance your experience, maintain security, remember preferences, and analyze platform usage.
          </p>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your computer or mobile device by your web browser when you visit a website. They allow the website to recognize your device, maintain session states, and remember specific parameters over time.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>2. Types of Cookies We Use</h2>
            <p>
              We categorize our cookies as follows:
            </p>
            <ul style={{ paddingLeft: "20px", display: "grid", gap: "12px" }}>
              <li>
                <strong>Essential Cookies:</strong> Required for security, authentication, and core platform operations. Without these cookies, you would not be able to log in, maintain your session, or access private features.
              </li>
              <li>
                <strong>Preference Cookies:</strong> Used to remember your custom filter settings, dashboard sorting choices, dark mode preferences, and watchlisted IPOs.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Gather anonymous statistics on how users interact with IPO Lens (e.g., pages visited, clicks, loading speeds). This helps us improve website design and performance.
              </li>
              <li>
                <strong>Marketing Cookies:</strong> Monitor the performance of our newsletters and marketing campaigns. We do not sell this data to external ad networks.
              </li>
            </ul>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>3. Managing or Disabling Cookies</h2>
            <p>
              You can control or disable cookies at any time via your browser&apos;s settings panel. Most browsers allow you to block all cookies, delete existing cookies, or receive a warning before a cookie is stored. Please note that if you disable essential cookies, certain features (like logging in or maintaining watchlists) may not function correctly.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>4. Third-Party Cookies</h2>
            <p>
              In some instances, third-party services integrated into our site (such as analytics tools, cloud hosting dashboards, or email notification providers) may set their own tracking cookies to handle authentication or session metrics. We do not control these third-party cookies directly; please consult their respective privacy policies for details.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>5. Policy Updates</h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in our technology or compliance requirements. The updated policy will be posted on this page with an updated &quot;Last Updated&quot; date.
            </p>
          </section>

          <section style={{ display: "grid", gap: "12px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "800", color: "var(--ink)" }}>6. Contact Us</h2>
            <p>
              If you have any questions regarding our use of cookies, please email us at <a href="mailto:privacy@ipolens.in" style={{ color: "var(--blue)" }}>privacy@ipolens.in</a>.
            </p>
          </section>

        </article>
      </div>
    </main>
  );
}
