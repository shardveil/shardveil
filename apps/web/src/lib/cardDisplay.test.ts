import { describe, expect, it } from "vitest";

import {
  CARD_PLACEHOLDER_IMAGE,
  cardDisplayName,
  cardImageUrl,
  rarityName,
} from "./cardDisplay";

describe("rarityName", () => {
  // The API sends CardRegistry's enum ordinal. Passing that number straight to
  // the UI is what made /cards/[cardId] throw on rarity.toLowerCase() and 500.
  it.each([
    [0, "COMMON"],
    [1, "UNCOMMON"],
    [2, "RARE"],
    [3, "EPIC"],
    [4, "LEGENDARY"],
    [5, "MYTHIC"],
  ])("maps ordinal %i to %s", (ordinal, expected) => {
    expect(rarityName(ordinal)).toBe(expected);
  });

  it("returns a string for every ordinal, never undefined", () => {
    for (let i = 0; i <= 5; i++) {
      expect(typeof rarityName(i)).toBe("string");
    }
  });

  it("falls back to COMMON for an unknown ordinal", () => {
    // A new rarity added on chain must not render "undefined" in a badge.
    expect(rarityName(9)).toBe("COMMON");
  });

  it("accepts an already-converted string", () => {
    expect(rarityName("epic")).toBe("EPIC");
    expect(rarityName("MYTHIC")).toBe("MYTHIC");
  });

  it("falls back to COMMON for an unrecognised string", () => {
    expect(rarityName("banana")).toBe("COMMON");
  });
});

describe("cardDisplayName", () => {
  it("uses the metadata name when present", () => {
    expect(cardDisplayName("Ash Rat", 1)).toBe("Ash Rat");
  });

  it("falls back to the id when metadata has no name", () => {
    // name is null until CARD_METADATA_CID is configured on the API.
    expect(cardDisplayName(null, 42)).toBe("Card #42");
    expect(cardDisplayName(undefined, 42)).toBe("Card #42");
  });

  it("treats a blank name as missing", () => {
    expect(cardDisplayName("   ", 7)).toBe("Card #7");
  });
});

describe("cardImageUrl", () => {
  it("returns the placeholder when the card has no art", () => {
    // No card has artwork: the pinned metadata has no `image` key at all.
    expect(cardImageUrl(null)).toBe(CARD_PLACEHOLDER_IMAGE);
    expect(cardImageUrl(undefined)).toBe(CARD_PLACEHOLDER_IMAGE);
    expect(cardImageUrl("")).toBe(CARD_PLACEHOLDER_IMAGE);
  });

  it("passes a real art URL through untouched", () => {
    expect(cardImageUrl("ipfs://cid/1.png")).toBe("ipfs://cid/1.png");
  });

  it("points at a file that ships in public/", () => {
    expect(CARD_PLACEHOLDER_IMAGE.startsWith("/")).toBe(true);
  });
});
