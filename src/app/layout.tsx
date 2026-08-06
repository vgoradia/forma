import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { getAppUrl } from "@/lib/app-url";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forma — AI Shopping Copilot",
  description:
    "Upload any screenshot, link, or image. Forma identifies the product, compares prices, finds alternatives, and tells you whether to buy.",
  metadataBase: new URL(getAppUrl()),
  applicationName: "Forma",
  keywords: ["AI shopping", "price comparison", "fashion", "product finder", "shopping copilot"],
  openGraph: {
    title: "Forma — AI Shopping Copilot",
    description: "Should you buy it? Forma knows. Prices, alternatives, and a clear verdict in seconds.",
    type: "website",
    siteName: "Forma",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forma — AI Shopping Copilot",
    description: "Should you buy it? Forma knows.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1A1B26",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AnalyticsProvider />
      </body>
    </html>
  );
}
