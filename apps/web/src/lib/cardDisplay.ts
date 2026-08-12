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
 * cardType is a bare uint8 in ICardRegistry with no enum, and the pinned
 * metadata carries the number without a name — so nothing on chain or in the
 * corpus labels these.
 *
 * The whitepaper describes "element type (Fire/Water/Dark/Light/Void)" — five
 * names — while the live data uses six values (1-6, each about a sixth of the
 * 1000 cards). Until that is settled, render the ordinal rather than guess a
 * mapping that would mislabel every card.
 */
export function cardTypeLabel(cardType: number | null | undefined): string {
  return typeof cardType === "number" && cardType > 0
    ? `Type ${cardType}`
    : "—";
}
