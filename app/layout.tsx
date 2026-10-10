import type { Metadata } from "next";
import { Geist, Instrument_Sans, IBM_Plex_Mono, Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/web/Providers";

const geist = Geist({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-geist" });
const instrument = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-instrument" });
// Stock card type (design handoff).
const archivo = Archivo({ subsets: ["latin"], weight: ["500", "700", "800", "900"], variable: "--font-archivo" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-jbmono" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://medianmarkets.vercel.app";
const DESCRIPTION = "Build an ETF from real tokenized stocks on BNB Chain. The top half wins every round.";
const SHARE_TITLE = "Median Markets · Build an ETF. Beat the league.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Median Markets",
  icons: { icon: "/brand/mark.svg", apple: "/brand/mark.svg" },
  description: DESCRIPTION,
  // Link previews on X, Telegram, Discord…; the image is app/opengraph-image.tsx.
  openGraph: { type: "website", siteName: "Median Markets", title: SHARE_TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card: "summary_large_image", title: SHARE_TITLE, description: DESCRIPTION },
};

// Applies a saved theme before paint, so there is no flash.
const themeScript = `try{var t=localStorage.getItem("los-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${instrument.variable} ${plexMono.variable} ${archivo.variable} ${jbMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
