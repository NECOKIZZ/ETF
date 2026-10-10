// Link-preview image pieces (Open Graph / X cards), drawn with next/og.
// Brand colours only; stock cards in their own colours, like the hero deck.
// Fonts come from Google Fonts at build time; if that fails the image still
// renders with the default font.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BSTOCKS, type StockInfo } from "../ui/data/stocks";
import { BRAND, MARK_SRC } from "../ui/components/Logo";

export const OG_SIZE = { width: 1200, height: 630 };

export const INK = "#0B0B0C";
export const PAPER = "#FFFFFF";
export const MUTED = "rgba(11, 11, 12, 0.6)";
/** The landing hero's light mint wash. */
export const MINT_BG = "linear-gradient(135deg, #FFFFFF 0%, rgba(61, 220, 151, 0.10) 45%, rgba(61, 220, 151, 0.38) 100%)";

type Font = { name: string; data: ArrayBuffer; weight: 300 | 500 | 600 | 900; style: "normal" };

async function googleFont(family: string, weight: Font["weight"]): Promise<Font | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    if (!url) return null;
    return { name: family, data: await (await fetch(url)).arrayBuffer(), weight, style: "normal" };
  } catch {
    return null;
  }
}

/** The site's type: Geist Light (headline), Instrument Sans (text), Archivo Black (tickers), IBM Plex Mono (pills). */
export async function ogFonts(): Promise<Font[]> {
  const fs = await Promise.all([googleFont("Geist", 300), googleFont("Instrument Sans", 500), googleFont("Instrument Sans", 600), googleFont("Archivo", 900), googleFont("IBM Plex Mono", 500)]);
  return fs.filter((f): f is Font => !!f);
}

/** The "Md" mark as a data URI (the same file the header and browser tab use). */
export async function markDataUri(): Promise<string> {
  const svg = await readFile(join(process.cwd(), "public", MARK_SRC));
  return `data:image/svg+xml;base64,${svg.toString("base64")}`;
}

export const stockOf = (ticker: string): StockInfo => BSTOCKS.find((s) => s.ticker === ticker)!;

export function LogoRow({ mark }: { mark: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mark} width={44} height={44} alt="" />
      <div style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 30, letterSpacing: "-0.03em", color: INK }}>{BRAND}</div>
    </div>
  );
}

/** A stock card in the hero deck's style: the stock's colours, its ticker, and a white pill. */
export function OgCard({ stock, pill, rotate = 0, dy = 0, w = 210, overlap = 0.18 }: { stock: StockInfo; pill: string; rotate?: number; dy?: number; w?: number; overlap?: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: w,
        height: Math.round(w * 1.36),
        borderRadius: w * 0.14,
        padding: w * 0.08,
        marginLeft: -w * overlap,
        transform: `translateY(${dy}px) rotate(${rotate}deg)`,
        background: `linear-gradient(180deg, #000000 0%, ${stock.color} 48%, ${stock.colorLight} 100%)`,
        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        border: "4px solid rgba(255,255,255,0.9)",
      }}
    >
      <div style={{ display: "flex" }}>
        <div style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: w * 0.055, letterSpacing: "0.14em", color: PAPER, background: "rgba(255,255,255,0.16)", borderRadius: 999, padding: "5px 10px" }}>
          BSTOCK
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontFamily: "Archivo", fontWeight: 900, fontSize: stock.ticker.length > 4 ? w * 0.22 : w * 0.28, lineHeight: 0.9, letterSpacing: "-0.05em", color: PAPER }}>{stock.ticker}</div>
        <div style={{ display: "flex", marginTop: w * 0.06, background: PAPER, borderRadius: w * 0.07, padding: `${w * 0.045}px ${w * 0.06}px`, fontFamily: "IBM Plex Mono", fontWeight: 500, fontSize: w * 0.08, color: "#111111" }}>
          {pill}
        </div>
      </div>
    </div>
  );
}
