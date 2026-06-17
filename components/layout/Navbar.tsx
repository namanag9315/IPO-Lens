"use client";

import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";

const navLinks = [
  { href: "/", label: "Live IPOs" },
  { href: "/calendar", label: "Calendar" },
  { href: "/performance", label: "Performance" },
  { href: "/#analysis-engine", label: "Analysis Engine" },
  { href: "/#watchlist", label: "Watchlist" },
  { href: "/#methodology", label: "Learn" },
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

export default function Navbar() {
  const pathname = usePathname();

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
        </div>
      </div>
    </header>
  );
}
