import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { AuthProvider } from "@/components/auth-provider";
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
  title: "Forma — Buy or skip before you checkout",
  description:
    "The buy-or-skip button for viral fashion. Screenshot a find, get prices, dupes, and a clear buy / wait / skip verdict in seconds.",
  metadataBase: new URL(getAppUrl()),
  applicationName: "Forma",
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: [{ url: "/favicon.ico" }],
  },
  keywords: ["buy or skip", "fashion dupes", "TikTok shopping", "price comparison", "Forma"],
  openGraph: {
    title: "Forma — Buy or skip before you checkout",
    description: "Screenshot viral fashion finds. Get prices, dupes, and a buy / wait / skip verdict.",
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
        <AuthProvider>
          {children}
        </AuthProvider>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
