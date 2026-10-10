// The site's link preview (X, Telegram, Discord…): the hero's headline and its stock deck.
// The deck is the landing page's real cards (public/brand/og-deck.png, captured from
// the hero at 2x with a transparent background), so it always matches the site.
import { ImageResponse } from "next/og";
import { MARK_SRC } from "@/ui/components/Logo";
import { INK, LogoRow, MINT_BG, MUTED, OG_SIZE, ogFonts, publicDataUri } from "@/web/og";

export const alt = "Median Markets: build an ETF from real tokenized stocks on BNB Chain. The top half wins every round.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const [fonts, mark, deck] = await Promise.all([ogFonts(), publicDataUri(MARK_SRC, "image/svg+xml"), publicDataUri("/brand/og-deck.png", "image/png")]);
  return new ImageResponse(
    (
      <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", background: MINT_BG, padding: "64px 72px", fontFamily: "Instrument Sans" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={deck} width={560} height={284} alt="" style={{ position: "absolute", right: 20, top: 190 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <LogoRow mark={mark} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Geist", fontWeight: 300, fontSize: 80, lineHeight: 1, whiteSpace: "nowrap", letterSpacing: "-0.05em", color: INK }}>Build an ETF.</div>
            <div style={{ fontFamily: "Geist", fontWeight: 300, fontSize: 80, lineHeight: 1.05, whiteSpace: "nowrap", letterSpacing: "-0.05em", color: INK }}>Beat the league.</div>
            <div style={{ marginTop: 28, fontSize: 28, lineHeight: 1.35, color: MUTED, width: 520 }}>Real tokenized stocks on BNB Chain. Every round, the top half wins.</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: MUTED }}>medianmarkets.vercel.app</div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
