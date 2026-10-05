# Handoff: StockCard component

## Overview
`StockCard` is one shared component that shows a stock or fund. It's used in the landing deck, in pickers, in ETF hands, in league-table rows and in the ticker. It comes in three sizes: big, medium and tiny. Tiny has three widths: 64, 48 and 34 px.

## About the Design Files
`Stock Card.dc.html` is a **design reference built in HTML**. It's a prototype that shows the intended look and behaviour. It is not production code. Rebuild it in the target codebase using that codebase's own framework and patterns. Open the file in a browser to see every size.

## Fidelity
**High-fidelity.** Match the colours, type, spacing and radii exactly.

## Data (props)
```ts
type StockCardProps = {
  size: 'big' | 'medium' | 'tiny64' | 'tiny48' | 'tiny34';
  logo: string;        // URL; transparent PNG/SVG preferred
  ticker: string;      // "NVDA"
  name: string;        // "NVIDIA"
  price: number;       // 235.28
  pct: number;         // -2.63 (signed % change)
  weight?: number;     // 40 (ETF weight %)
  kind: 'bstock' | 'fund';
  color: string;       // stock's unique colour, e.g. "#4fae12"
  colorLight?: string; // pale tint for the bottom, e.g. "#ebf7e2" (derive if absent)
  showWeight?: boolean;// show weight pill on big card
};
```

## Background (shared by all sizes)
- Base colour `#000`. On top, a gradient layer that bleeds 30px past the card on every side, with `filter: blur(18px)`. The card clips it with `overflow:hidden`. The layer stacks these backgrounds (topmost first):
  1. `radial-gradient(38% 22% at 28% 52%, C 0%, transparent 100%)`
  2. `radial-gradient(30% 34% at 66% 40%, C 0%, transparent 100%)`
  3. `radial-gradient(34% 16% at 64% 74%, L 0%, transparent 100%)`
  4. `radial-gradient(28% 14% at 30% 80%, L 0%, transparent 100%)`
  5. `linear-gradient(180deg, #000 0%, #000 20%, C 48%, C 60%, L 82%, L 100%)`
- `C` is `color` and `L` is `colorLight`.
- **Logo watermark** (big and medium only):
  - The stock's logo `<img>`, placed absolutely with `object-fit: contain`.
  - Style: `transform: rotate(-14deg)`, `opacity: .16`, `filter: grayscale(1) brightness(1.6)`, `pointer-events: none`.
  - It sits above the gradient and below the content.

## Sizes

### Big — 218 × 312 (landing deck)
- Radius 22. Padding 15. Shadow `0 24px 48px -18px rgba(0,0,0,.6)`.
- Watermark is 170×170 at right −38px, top 118px.
- **Top row** (space-between):
  - Kind pill: "BSTOCK" or "FUND".
    - Archivo 700, 8px, letter-spacing .12em, white.
    - Padding 5/9, radius 999, background `rgba(255,255,255,.16)`.
  - Optional weight pill: JetBrains Mono 600, 8px, `#111` on white, padding 5/8.
  - Logo badge: 30px white circle with ring `0 0 0 2px rgba(255,255,255,.25)`, logo inside at 20px.
- **Ticker block** (24px below the top row):
  - Solid ticker: Archivo 900, line-height .86, letter-spacing −.05em, white.
  - Font size depends on ticker length: 3 chars = 72px, 4 chars = 60px, 5+ chars = 50px.
  - A second copy of the ticker sits directly below in outline only: `color: transparent; -webkit-text-stroke: 1.2px rgba(255,255,255,.9)`.
  - Name: 10px below, Archivo 500, 11px, `rgba(255,255,255,.92)`.
- **Price bar** (pinned to the bottom):
  - White, radius 16, padding 9/10/9/13, shadow `0 6px 18px -6px rgba(0,0,0,.25)`.
  - Price: JetBrains Mono 600, 14px, `#111`, letter-spacing −.02em, format `$235.28`.
  - Change: Mono 600, 10px, format `▲ 3.48%` / `▼ 2.63%`. Up is `#0f8a3c`, down is `#c8102e`.
  - Action button: 28px circle, `#111`, white "+", hover `#333`.

### Medium — 150 × 215 (pickers)
- Radius 16. Padding 10. Watermark is 118×118 at right −28px, top 80px.
- Kind pill is 7px text with padding 4/7. Logo badge is 22px with the logo at 14px.
- Ticker: 3 chars = 50px, 4 chars = 41px, 5+ chars = 34px, plus the outline copy. No company name.
- Price bar: white, radius 11, padding 7/10. Price is Mono 11px; change is Mono 9px. No + button.

### Tiny 64 × 84 (ETF hands)
- Radius 12. Simplified background: `linear-gradient(180deg,#000 0%, C 40%, L 80%)` with blur(6px). No watermark.
- Column with space-between, padding 8/4/6:
  - Logo badge: 26px with the logo at 17px.
  - Ticker: Archivo 900, 12px, `#111`.
  - Weight pill: Mono 600, 8px, on white, padding 2/6.

### Tiny 48 × 62
- Radius 10. Logo badge 22px, logo 14px. Ticker 10px. No weight.

### Tiny 34 × 34 (table rows)
- Radius 10. Background `linear-gradient(180deg,#000 0%, C 75%)`. Centred 22px white logo badge only.

## Example: table row
- Grid columns `34px 1fr auto auto`, gap 14, padding 10/16, divider `rgba(255,255,255,.06)`.
- Ticker: Archivo 800, 14px, white. Name: 11px, `#8fa59b`.
- Weight: Mono 12px, `#c9d6d0`.
- Price: Mono 13px, white. Change on a dark background: up `#4ade80`, down `#ff6b7d`.

## Interactions
- Deck fan (optional, deck only):
  - Each card is rotated `offset × 7deg`, pushed down `|offset| × 18px`, and overlapped by −30px margins.
  - On hover: lift 22px, cut rotation to 40%, scale 1.04, bring to the front.
  - Transition: `transform .35s cubic-bezier(.2,.8,.2,1)`.
- The live price ticking in the prototype is for demo only. Use real data.

## Design Tokens
- Fonts:
  - Archivo (500/700/800/900) for display and labels.
  - JetBrains Mono (500/600) for numbers.
- Neutrals: `#000`, `#111`, `#fff`, page background `#0f1a16`, muted text `#8fa59b`.
- Sample stock colours (C / L):
  - TSLA: `#d40a0a` / `#fde6e8`
  - META: `#0a6bd4` / `#e4effd`
  - NVDA: `#4fae12` / `#ebf7e2`
  - MSFT: `#6a3bf0` / `#ece6fd`
  - GOOGL: `#e86a00` / `#fdeee2`
- If there's no light tint, derive L by mixing C about 10% into white.
- Radii: 22 / 16 / 12 / 10 / 999.

## Assets
The prototype's logos are low-resolution placeholders (Google favicon service). Replace them with high-resolution transparent PNG or SVG logos. The watermark needs at least 256px.

## Files
- `Stock Card.dc.html`: shows every size. Open it in a browser.
