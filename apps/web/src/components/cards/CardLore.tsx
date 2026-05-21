// ─── CardLore ─────────────────────────────────────────────────────────────────
// Renders multi-paragraph lore text for a card.

interface CardLoreProps {
  lore?: string | undefined;
}

export function CardLore({ lore }: CardLoreProps) {
  if (!lore || lore.trim().length === 0) {
    return null;
  }

  const paragraphs = lore
    .split("\n\n")
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section aria-label="Card lore" className="space-y-3">
      <h3 className="font-display text-xs uppercase tracking-widest text-content-muted">
        Lore
      </h3>
      {/* Decorative separator */}
      <div className="h-px bg-gradient-to-r from-veil-800 via-stroke-emphasis to-transparent" />
      <blockquote className="space-y-3 border-l-2 border-veil-800 pl-4">
        {paragraphs.map((para, idx) => (
          <p
            key={`lore-${idx}-${para.slice(0, 12)}`}
            className="font-body text-base leading-relaxed text-content-secondary italic"
          >
            {para}
          </p>
        ))}
      </blockquote>
    </section>
  );
}
