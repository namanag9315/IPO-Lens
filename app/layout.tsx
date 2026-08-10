import type { Metadata } from "next";
import "./globals.css";
import MarketTicker from "@/components/layout/MarketTicker";
import Navbar from "@/components/layout/Navbar";
import { getTickerItems } from "@/lib/ipoData";

export const metadata: Metadata = {
  title: "IPO Lens — Indian IPO Intelligence",
  description: "Track GMP, subscription data and AI-powered analysis for every Indian IPO",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const tickerItems = await getTickerItems();

  return (
    <html lang="en">
      <body>
        <MarketTicker items={tickerItems} />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
