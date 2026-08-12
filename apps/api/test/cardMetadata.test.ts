import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cacheService } from "../src/services/cacheService";
import { getCardNames } from "../src/services/cardMetadataService";

/**
 * The real document is a 1000-entry array pinned on IPFS. Only cardId and name
 * are consumed; the repeated stat fields are ignored on purpose, since
 * CardRegistry is authoritative for anything that affects gameplay.
 */
const SAMPLE = [
  { cardId: 1, name: "Ash Rat", atkBase: 57, rarity: 0 },
  { cardId: 2, name: "Bone Imp", atkBase: 64, rarity: 0 },
  { cardId: 3, name: "Frostbite Dragon", atkBase: 89, rarity: 1 },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * The configured-CID cases import the service directly: CARD_METADATA_CID and
 * IPFS_GATEWAY_URL come from .env.test, so no module resetting is needed and the
 * service shares this file's Redis client. Only the unconfigured case resets, and
 * it asserts nothing about the cache.
 */
async function loadServiceWithoutCid() {
  vi.resetModules();
  vi.stubEnv("CARD_METADATA_CID", "");
  return import("../src/services/cardMetadataService");
}

beforeEach(async () => {
  await cacheService.del("cards:names");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getCardNames", () => {
  it("maps cardId to name from the pinned document", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(SAMPLE)));

    const names = await getCardNames();

    expect(names.get(1)).toBe("Ash Rat");
    expect(names.get(3)).toBe("Frostbite Dragon");
    expect(names.size).toBe(3);
  });

  it("builds the URL from the gateway and CID without a double slash", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE));
    vi.stubGlobal("fetch", fetchMock);

    await getCardNames();

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://gateway.test/ipfs/bafkreiTEST",
    );
  });

  it("serves the second call from Redis without refetching", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE));
    vi.stubGlobal("fetch", fetchMock);

    await getCardNames();
    const second = await getCardNames();

    // 200 KB over an IPFS gateway on every catalogue build would be absurd.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.get(2)).toBe("Bone Imp");
  });

  it("uses the pinned default CID when the env var is unset", async () => {
    // CARD_METADATA_CID is defaulted, not optional: leaving it unset used to
    // degrade every card to "Card #N" silently. A CID is public immutable data,
    // so the pinned document is the built-in fallback.
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(SAMPLE));
    vi.stubGlobal("fetch", fetchMock);
    const { getCardNames: withDefault } = await loadServiceWithoutCid();

    const names = await withDefault();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("bafkrei");
    expect(names.get(1)).toBe("Ash Rat");
  });

  it("degrades to empty on a gateway error rather than throwing", async () => {
    // A pinning outage must not take the card catalogue down with it.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("gateway down", { status: 502 })),
    );

    await expect(getCardNames()).resolves.toEqual(new Map());
  });

  it("degrades to empty when the document is the wrong shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ cards: "not an array" })),
    );

    await expect(getCardNames()).resolves.toEqual(new Map());
  });

  it("degrades to empty when the gateway is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ENOTFOUND gateway.test")),
    );

    await expect(getCardNames()).resolves.toEqual(new Map());
  });
});
