import Link from "next/link";
import FooterSubscribeForm from "@/components/ui/FooterSubscribeForm";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer-inner">
        <div className="site-footer-grid">
          <div className="site-footer-brand">
            <div className="site-footer-logo-row">
              <img src="/logo.png" alt="IPO Lens Logo" />
              <div>
                <strong>IPO Lens</strong>
                <span>Smarter IPO Research</span>
              </div>
            </div>
            <p>
              Helping retail investors make informed decisions with data, research and clarity.
            </p>
            <div className="site-footer-socials" aria-label="Social links">
              <a href="#" aria-label="IPO Lens on X">X</a>
              <a href="#" aria-label="IPO Lens on YouTube">▶</a>
              <a href="#" aria-label="IPO Lens updates">↗</a>
            </div>
          </div>

          <div className="site-footer-column">
            <h4>Quick Links</h4>
            <Link href="/calendar">IPO Calendar</Link>
            <Link href="/#ipos">Live Research</Link>
            <Link href="/#watchlist">Watchlist</Link>
            <Link href="/blog">Blog</Link>
          </div>

          <div className="site-footer-column">
            <h4>Learn</h4>
            <Link href="/learn#what-is-ipo">IPO Basics</Link>
            <Link href="/learn#key-terms">Glossary</Link>
            <Link href="/learn#analyze-ipo">How IPO Score Works</Link>
            <Link href="/learn#sme-ipo">SME IPOs</Link>
          </div>

          <div className="site-footer-column">
            <h4>Company</h4>
            <Link href="/methodology">Methodology</Link>
            <Link href="/ai-disclosure">AI Disclosure</Link>
            <Link href="/terms">Terms of Use</Link>
            <Link href="/privacy-policy">Privacy Policy</Link>
          </div>

          <div className="site-footer-column site-footer-updates">
            <h4>Stay Updated</h4>
            <p>Get IPO alerts, research and insights delivered to your inbox.</p>
            <FooterSubscribeForm />
          </div>
        </div>

        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} IPO Lens. All rights reserved.</span>
          <span>
            Disclaimer: IPO Lens is an educational platform. We do not provide investment advice or recommendations.
          </span>
        </div>
      </div>
    </footer>
  );
}
