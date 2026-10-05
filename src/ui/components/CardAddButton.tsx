"use client";

// The black "+" on a big stock card (its own client component so the card
// itself can render on the server).

import { CARD } from "../data/palette";

export function CardAddButton({ onAdd, label }: { onAdd?: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label={label}
      className="flex items-center justify-center rounded-full transition-colors"
      style={{ width: 28, height: 28, background: CARD.text, color: CARD.white, fontSize: 15, lineHeight: 1 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = CARD.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = CARD.text)}
    >
      +
    </button>
  );
}
