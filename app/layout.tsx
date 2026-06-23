import type { Metadata } from "next";
import "./globals.css";
import MarketTicker from "@/components/layout/MarketTicker";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FloatingSubscribe from "@/components/ui/FloatingSubscribe";
import { Analytics } from "@vercel/analytics/react";
import { getTickerItems, getLiveIndices } from "@/lib/ipoData";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "IPO Lens — Indian IPO Intelligence",
  description: "Track GMP, subscription data and AI-powered analysis for every Indian IPO",
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
      </body>
    </html>
  );
}
