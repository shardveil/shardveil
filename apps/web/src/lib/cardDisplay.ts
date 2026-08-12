/**
 * Card presentation helpers.
 *
 * The API returns raw on-chain shapes: `rarity` is a CardRegistry enum ordinal,
 * `name` is null until the pinned metadata is configured, and there is no image
 * field at all. The UI wants strings and a src. Every card surface must convert
 * through here — casting the API response straight to a UI type is what left
 * /cards/[cardId] throwing a 500 on `rarity.toLowerCase()`.
 */

/** ICardRegistry.Rarity ordinals. */
export const RARITY_NAMES: Record<number, string> = {
  0: "COMMON",
  1: "UNCOMMON",
  2: "RARE",
  3: "EPIC",
  4: "LEGENDARY",
  5: "MYTHIC",
};

/**
 * Shipped placeholder art. No card has real artwork yet: the pinned metadata
 * document carries names and stats but no `image` key, so every tile renders
 * this until art exists.
 */
export const CARD_PLACEHOLDER_IMAGE = "/card-placeholder.svg";

/**
 * Rarity ordinal to display string.
 *
 * Accepts the number the API sends and tolerates a string, since some callers
 * already hold a converted value. Unknown ordinals fall back to COMMON rather
 * than rendering "undefined".
 */
export function rarityName(rarity: number | string): string {
  if (typeof rarity === "string") {
    const upper = rarity.toUpperCase();
    return Object.values(RARITY_NAMES).includes(upper) ? upper : "COMMON";
  }

  return RARITY_NAMES[rarity] ?? "COMMON";
}

/** Display name, falling back to the id when metadata has no name for this card. */
export function cardDisplayName(
  name: string | null | undefined,
  cardId: number,
): string {
  const trimmed = name?.trim();
  return trimmed ? trimmed : `Card #${cardId}`;
}

/** Art URL, or the placeholder when the card has none. */
export function cardImageUrl(imageUrl: string | null | undefined): string {
  return imageUrl && imageUrl.length > 0 ? imageUrl : CARD_PLACEHOLDER_IMAGE;
}

/**
 * ICardRegistry.Rarity's sibling: cardType is the element, 1-6.
 *
 * The contract declares it a bare uint8 with no enum and never reads it, and the
 * pinned metadata carries the number alone — nothing in code or data names these,
 * and the names carry no signal either (all 1000 grouped by type score identically
 * on elemental keywords). The mapping below is the project's, not an inference.
 *
 * 0 / unknown renders as a dash rather than mislabelling a card.
 */
export const ELEMENT_NAMES: Record<number, string> = {
  1: "Earth",
  2: "Fire",
  3: "Water",
  4: "Dark",
  5: "Light",
  6: "Void",
};

export function cardTypeLabel(cardType: number | null | undefined): string {
  return typeof cardType === "number" ? (ELEMENT_NAMES[cardType] ?? "—") : "—";
}
