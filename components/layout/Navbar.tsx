"use client";

import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ButtonLink } from "@/components/ui/Button";

const navLinks = [
  { href: "/", label: "Live IPOs" },
  { href: "/calendar", label: "Calendar" },
  { href: "/allotment", label: "Allotment" },
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
        <Link aria-label="IPO Lens home" className="premium-brand" href="/">
          <span className="premium-brand-mark">IPO</span>
          <span>IPO Lens</span>
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
          <NotificationBell />
          <Link aria-label="Account" className="premium-user-button" href="/#watchlist">
            <UserRound size={18} />
          </Link>
        </div>
      </div>
    </header>
  );
}
