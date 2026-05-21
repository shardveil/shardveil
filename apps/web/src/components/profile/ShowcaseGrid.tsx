import { type CardData, CardThumbnail } from "@/components/cards/CardThumbnail";

// ─── ShowcaseGrid ─────────────────────────────────────────────────────────────

const MAX_SHOWCASE_CARDS = 6;

interface ShowcaseGridProps {
  cards: CardData[];
}

export function ShowcaseGrid({ cards }: ShowcaseGridProps) {
  if (cards.length === 0) {
    return (
      <p className="font-body text-sm text-content-muted text-center py-8 motion-safe:transition-colors motion-safe:duration-200">
        No cards in showcase yet.
      </p>
    );
  }

  const visibleCards = cards.slice(0, MAX_SHOWCASE_CARDS);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {visibleCards.map((card) => (
        <CardThumbnail key={card.id} {...card} />
      ))}
    </div>
  );
}
