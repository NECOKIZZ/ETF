// Link-preview image pieces (Open Graph / X cards), drawn with next/og.
// Fonts come from Google Fonts at build time; if that fails the image still
// renders with the default font.

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BRAND } from "../ui/components/Logo";

export const OG_SIZE = { width: 1200, height: 630 };

export const INK = "#0B0B0C";
export const MUTED = "rgba(11, 11, 12, 0.6)";
/** The landing hero's light mint wash. */
export const MINT_BG = "linear-gradient(135deg, #FFFFFF 0%, rgba(61, 220, 151, 0.10) 45%, rgba(61, 220, 151, 0.38) 100%)";

type Font = { name: string; data: ArrayBuffer; weight: 300 | 500 | 600; style: "normal" };

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

/** The site's type: Geist Light (headline) and Instrument Sans (text). */
export async function ogFonts(): Promise<Font[]> {
  const fs = await Promise.all([googleFont("Geist", 300), googleFont("Instrument Sans", 500), googleFont("Instrument Sans", 600)]);
  return fs.filter((f): f is Font => !!f);
}

/** A data URI for an image under public/. */
export async function publicDataUri(path: string, type: string): Promise<string> {
  const buf = await readFile(join(process.cwd(), "public", path));
  return `data:${type};base64,${buf.toString("base64")}`;
}

export function LogoRow({ mark }: { mark: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mark} width={44} height={44} alt="" />
      <div style={{ fontFamily: "Instrument Sans", fontWeight: 600, fontSize: 30, letterSpacing: "-0.03em", color: INK }}>{BRAND}</div>
    </div>
  );
}
