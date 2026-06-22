import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "IPO Lens Blog — Indian IPO Analysis & Insights",
  description: "Read in-depth analysis, regulatory guides, GMP updates, and detailed explanations of the biggest upcoming Indian listings.",
};

const blogPosts = [
  {
    slug: "jio-ipo-2026",
    title: "Jio IPO 2026: India's Biggest-Ever Listing, Explained",
    excerpt: "Everything you need to know about Jio Platforms' filing — the switch from OFS to fresh issue, financials, valuation, and what it means for retail investors.",
    coverIcon: "📡",
    coverGradient: "linear-gradient(135deg, var(--ink) 0%, var(--blue) 100%)",
    date: "June 22, 2026",
    readTime: "8 min read",
    tag: "IPO Analysis",
  },
];

export default function BlogIndexPage() {
  return (
    <main style={{ padding: "48px 24px 72px" }}>
      <div className="shell" style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <header style={{ marginBottom: "40px", borderBottom: "1px solid var(--line)", paddingBottom: "24px" }}>
          <span style={{
            fontSize: "11px",
            fontWeight: "800",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--blue)",
            display: "inline-block",
            marginBottom: "8px"
          }}>
            Analysis & Updates
          </span>
          <h1 style={{
            fontSize: "36px",
            fontWeight: "900",
            color: "var(--ink)",
            letterSpacing: "-0.04em",
            lineHeight: "1.15",
            marginBottom: "12px"
          }}>
            The IPO Lens Blog
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "16px", lineHeight: "1.5", maxWidth: "600px" }}>
            Deep dives, regulatory explainers, valuation snapshots, and practical checklists on Indian listings.
          </p>
        </header>

        <div className="blog-grid">
          {blogPosts.map((post) => (
            <article className="blog-card" key={post.slug}>
              <div className="blog-card-cover" style={{ background: post.coverGradient }}>
                <span>{post.coverIcon}</span>
              </div>
              <div className="blog-card-body">
                <span className="blog-card-tag">{post.tag}</span>
                <h3>
                  <Link href={`/blog/${post.slug}`} style={{ textDecoration: "none", color: "inherit" }}>
                    {post.title}
                  </Link>
                </h3>
                <p>{post.excerpt}</p>
                <div className="blog-card-meta">
                  <span>{post.date}</span>
                  <span className="dot" />
                  <span>{post.readTime}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
