import type { Metadata } from "next";
import "./globals.css";
import MarketTicker from "@/components/layout/MarketTicker";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingSubscribe from "@/components/ui/FloatingSubscribe";
import { Analytics } from "@vercel/analytics/react";
import { getTickerItems, getLiveIndices } from "@/lib/ipoData";

export const dynamic = "force-dynamic";

const siteUrl = "https://ipolens.co.in";
const siteName = "IPO Lens";
const siteDescription =
  "Track Indian IPO GMP, subscription demand, IPO calendar, allotment links, listing performance and plain-English IPO research in one dashboard.";
const siteLogoUrl = `${siteUrl}/logo.png`;
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "IPO Lens - Indian IPO Intelligence",
    template: "%s | IPO Lens",
  },
  description: siteDescription,
  keywords: [
    "IPO Lens",
    "Indian IPO",
    "IPO GMP",
    "IPO calendar",
    "IPO subscription status",
    "IPO allotment",
    "SME IPO",
    "mainboard IPO",
  ],
  openGraph: {
    title: "IPO Lens - Indian IPO Intelligence",
    description: siteDescription,
    images: [
      {
        url: siteLogoUrl,
        width: 512,
        height: 512,
        alt: "IPO Lens",
      },
    ],
    locale: "en_IN",
    siteName,
    type: "website",
    url: siteUrl,
  },
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  twitter: {
    card: "summary_large_image",
    title: "IPO Lens - Indian IPO Intelligence",
    description: siteDescription,
    images: [siteLogoUrl],
  },
  ...(googleSiteVerification
    ? {
        verification: {
          google: googleSiteVerification,
        },
      }
    : {}),
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@id": `${siteUrl}/#organization`,
      "@type": "Organization",
      name: siteName,
      url: siteUrl,
      logo: siteLogoUrl,
      sameAs: [siteUrl],
    },
    {
      "@id": `${siteUrl}/#website`,
      "@type": "WebSite",
      description: siteDescription,
      inLanguage: "en-IN",
      name: siteName,
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        queryInput: "required name=search_term_string",
        target: `${siteUrl}/?q={search_term_string}#ipos`,
      },
      url: siteUrl,
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tickerItems = await getTickerItems();
  const liveIndices = await getLiveIndices();

  return (
    <html lang="en">
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <MarketTicker items={tickerItems} indices={liveIndices} />
        <Navbar />
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
        <FloatingSubscribe />
        <Analytics />
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          type="application/ld+json"
        />
      </body>
    </html>
  );
}
