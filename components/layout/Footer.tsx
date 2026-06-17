import Link from "next/link";

export default function Footer() {
  return (
    <footer style={{
      background: "var(--primary-navy)",
      color: "rgba(255, 255, 255, 0.7)",
      padding: "48px 24px 32px",
      fontSize: "13px",
      borderTop: "1px solid var(--surface-soft)",
      marginTop: "auto"
    }}>
      <div className="shell" style={{ display: "grid", gap: "32px" }}>
        
        {/* Footer Top: Brand and Disclaimer */}
        <div style={{ display: "grid", gap: "16px", maxWidth: "800px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/logo.png" alt="IPO Lens Logo" style={{ width: "28px", height: "28px", borderRadius: "8px", objectFit: "cover" }} />
            <span style={{ fontWeight: "800", fontSize: "16px", color: "#fff", letterSpacing: "-0.02em" }}>IPO Lens</span>
          </div>
          <p style={{ lineHeight: "1.6", color: "rgba(255, 255, 255, 0.55)" }}>
            <strong>Disclaimer:</strong> IPO Lens is for educational and informational purposes only. We do not provide investment advice or IPO recommendations. IPO Lens is not a SEBI-registered investment adviser or research analyst. IPO investments are subject to market risks. GMP is unofficial, unregulated, and not guaranteed. Please read the official offer documents (DRHP/RHP) fully before making any investment decision.
          </p>
        </div>

        {/* Footer Middle: Compliance Links Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "24px",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          paddingTop: "24px"
        }}>
          <div>
            <h4 style={{ color: "#fff", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Compliance</h4>
            <div style={{ display: "grid", gap: "8px" }}>
              <Link href="/disclaimer" style={{ color: "rgba(255, 255, 255, 0.6)", textDecoration: "none" }} className="footer-link">Main Disclaimer</Link>
              <Link href="/risk-disclosure" style={{ color: "rgba(255, 255, 255, 0.6)", textDecoration: "none" }} className="footer-link">Risk Disclosure</Link>
              <Link href="/grievance-redressal" style={{ color: "rgba(255, 255, 255, 0.6)", textDecoration: "none" }} className="footer-link">Grievance Redressal</Link>
            </div>
          </div>

          <div>
            <h4 style={{ color: "#fff", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Policies</h4>
            <div style={{ display: "grid", gap: "8px" }}>
              <Link href="/terms" style={{ color: "rgba(255, 255, 255, 0.6)", textDecoration: "none" }} className="footer-link">Terms & Conditions</Link>
              <Link href="/privacy-policy" style={{ color: "rgba(255, 255, 255, 0.6)", textDecoration: "none" }} className="footer-link">Privacy Policy</Link>
              <Link href="/cookie-policy" style={{ color: "rgba(255, 255, 255, 0.6)", textDecoration: "none" }} className="footer-link">Cookie Policy</Link>
            </div>
          </div>

          <div>
            <h4 style={{ color: "#fff", fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px" }}>Transparency</h4>
            <div style={{ display: "grid", gap: "8px" }}>
              <Link href="/methodology" style={{ color: "rgba(255, 255, 255, 0.6)", textDecoration: "none" }} className="footer-link">Data & Methodology</Link>
              <Link href="/ai-disclosure" style={{ color: "rgba(255, 255, 255, 0.6)", textDecoration: "none" }} className="footer-link">AI Disclosure Policy</Link>
            </div>
          </div>
        </div>

        {/* Footer Bottom: Copyright */}
        <div style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          paddingTop: "16px",
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          color: "rgba(255, 255, 255, 0.4)",
          fontSize: "11px"
        }}>
          <span>© {new Date().getFullYear()} IPO Lens. All rights reserved.</span>
          <span>Created for educational review and retail investor awareness. GMP and subscription data sourced from <a href="https://ipoguru.in" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255, 255, 255, 0.5)", textDecoration: "underline" }}>IPO Guru API</a>.</span>
        </div>
      </div>
    </footer>
  );
}
