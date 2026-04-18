import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { ReactNode } from "react";
import { NetworkGuard } from "@/components/web3/network-guard";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import "./globals.css";

const Web3Providers = dynamic(
  () => import("@/components/web3/providers").then((m) => m.Web3Providers),
  { ssr: false },
);

export const metadata: Metadata = {
  title: "AdNode — Confidential ad settlement",
  description: "Hoster and developer ad flows on Fhenix CoFHE–compatible chains",
  icons: {
    icon: "/adnode-favicon.svg",
    apple: "/adnode-favicon.svg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="nebula">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider>
          <Web3Providers>
            <div className="flex min-h-screen flex-1 flex-col">
              <NetworkGuard>{children}</NetworkGuard>
              <SiteFooter />
            </div>
          </Web3Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
