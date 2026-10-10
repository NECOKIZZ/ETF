// The site's link preview (X, Telegram, Discord…): the hero's headline and stock deck.
import { ImageResponse } from "next/og";
import { INK, LogoRow, MINT_BG, MUTED, OG_SIZE, OgCard, markDataUri, ogFonts, stockOf } from "@/web/og";

export const alt = "Median Markets: build an ETF from real tokenized stocks on BNB Chain. The top half wins every round.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const deck = ["TSLA", "NVDA", "MSFT"].map(stockOf);
  const [fonts, mark] = await Promise.all([ogFonts(), markDataUri()]);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: MINT_BG, padding: "64px 0 64px 72px", fontFamily: "Instrument Sans" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640, flexShrink: 0 }}>
          <LogoRow mark={mark} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Geist", fontWeight: 300, fontSize: 84, lineHeight: 1, whiteSpace: "nowrap", letterSpacing: "-0.05em", color: INK }}>Build an ETF.</div>
            <div style={{ fontFamily: "Geist", fontWeight: 300, fontSize: 84, lineHeight: 1.05, whiteSpace: "nowrap", letterSpacing: "-0.05em", color: INK }}>Beat the league.</div>
            <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.35, color: MUTED, width: 540 }}>Real tokenized stocks on BNB Chain. Every round, the top half wins.</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED }}>medianmarkets.vercel.app</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", paddingLeft: 36 }}>
          {deck.map((s, i) => (
            <OgCard key={s.ticker} stock={s} pill={s.name.split(" ")[0]} rotate={[-9, 0, 9][i]} dy={[22, 0, 22][i]} w={178} overlap={0.2} />
          ))}
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
