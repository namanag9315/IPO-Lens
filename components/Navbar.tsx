"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Logo from "@/components/ui/Logo";

const navLinks = [
  { href: "/", label: "Live IPOs" },
  { href: "/calendar", label: "Calendar" },
  { href: "/performance", label: "Performance" },
  { href: "/allotment", label: "Allotment" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="shell topbar-inner">
        <Link className="brand" href="/" aria-label="IPO Lens home">
          <Logo size={34} />
          <span>IPO Lens</span>
        </Link>

        <nav className="nav" aria-label="Primary navigation">
          {navLinks.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

            return (
              <Link
                href={link.href}
                key={link.href}
                style={{
                  color: isActive ? "var(--ink)" : "var(--muted)",
                  fontWeight: isActive ? 800 : 600,
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ alignItems: "center", display: "flex", gap: 10 }}>
          <Link className="btn" href="/performance">
            Accuracy
          </Link>
          <Link className="btn btn-primary" href="/?filter=open">
            Explore IPOs
          </Link>
        </div>
      </div>
    </header>
  );
}
