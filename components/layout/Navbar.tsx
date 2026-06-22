"use client";

import Link from "next/link";
import { ChevronDown, Menu, Search, UserRound, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { useState, useEffect } from "react";

const navLinks = [
  { href: "/", label: "Live IPOs" },
  { href: "/?filter=upcoming#ipos", label: "Upcoming" },
  { href: "/calendar", label: "IPO Calendar" },
  { href: "/#watchlist", label: "Watchlist" },
  { href: "/learn", label: "Learn" },
  { href: "/blog", label: "Blog" },
];

const toolLinks = [
  { href: "/allotment", label: "Allotment Checker" },
  { href: "/performance", label: "Listing Performance" },
  { href: "/methodology", label: "Methodology" },
  { href: "/risk-disclosure", label: "Risk Disclosure" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href.startsWith("/#")) {
    return false;
  }

  return pathname.startsWith(href);
}

function isToolActive(pathname: string) {
  return toolLinks.some((link) => pathname.startsWith(link.href));
}

export default function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add("no-scroll");
    } else {
      document.body.classList.remove("no-scroll");
    }
    return () => {
      document.body.classList.remove("no-scroll");
    };
  }, [mobileMenuOpen]);

  // Close mobile menu when page path changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="premium-navbar">
      <div className="shell premium-navbar-inner">
        <Link aria-label="IPO Lens home" className="premium-brand" href="/" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <img src="/logo.png" alt="IPO Lens Logo" className="premium-brand-mark" style={{ objectFit: "cover" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", justifyContent: "center" }}>
            <span style={{ fontSize: "20px", fontWeight: "900", color: "var(--ink)", lineHeight: "1.1", letterSpacing: "-0.035em" }}>IPO Lens</span>
            <span style={{ fontSize: "8px", fontWeight: "700", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: "1" }}>Smarter IPO Research</span>
          </div>
        </Link>

        <nav aria-label="Primary navigation" className="premium-nav">
          {navLinks.map((link) => (
            <Link className={isActive(pathname, link.href) ? "active" : ""} href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
          <div className={`premium-tools-menu ${isToolActive(pathname) ? "active" : ""}`}>
            <button aria-haspopup="menu" type="button">
              Tools
              <ChevronDown size={14} />
            </button>
            <div className="premium-tools-popover" role="menu">
              {toolLinks.map((link) => (
                <Link href={link.href} key={link.href} role="menuitem">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="premium-navbar-actions">
          <form action="/#ipos" className="premium-search">
            <Search size={16} />
            <input aria-label="Search IPOs" name="q" placeholder="Search for IPO, company or sector..." />
            <span className="premium-search-kbd">⌘K</span>
          </form>
          <ButtonLink href="/#ipos" variant="primary">
            Explore IPOs →
          </ButtonLink>
          <Link aria-label="Account" className="premium-user-button" href="/#watchlist">
            <UserRound size={18} />
          </Link>
          <button
            className="premium-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Premium Mobile Menu Drawer */}
      <div className={`premium-mobile-drawer ${mobileMenuOpen ? "open" : ""}`}>
        <div className="drawer-overlay" onClick={() => setMobileMenuOpen(false)} />
        <div className="drawer-content">
          <nav className="mobile-nav">
            {navLinks.map((link) => (
              <Link
                className={isActive(pathname, link.href) ? "active" : ""}
                href={link.href}
                key={link.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mobile-nav-group">
              <span>Tools</span>
              {toolLinks.map((link) => (
                <Link
                  className={isActive(pathname, link.href) ? "active" : ""}
                  href={link.href}
                  key={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>

          <div className="mobile-drawer-actions">
            <form action="/#ipos" className="premium-search" onSubmit={() => setMobileMenuOpen(false)}>
              <Search size={16} />
              <input aria-label="Search IPOs" name="q" placeholder="Search for IPO, company or sector..." />
            </form>
            <ButtonLink href="/#ipos" variant="primary" onClick={() => setMobileMenuOpen(false)}>
              Explore IPOs →
            </ButtonLink>
          </div>
        </div>
      </div>
    </header>
  );
}
