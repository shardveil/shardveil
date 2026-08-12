import { describe, expect, it, vi } from "vitest";

/**
 * /cards/2, /cards/5 and friends were intermittently answering
 *   404 {"code":"NOT_FOUND","message":"Card not found"}
 * for cards that are registered and render fine on the next request.
 *
 * CardRegistry.getTemplate returns a zeroed struct both for an unregistered id
 * and when the RPC rate-limits and replies 0x (viem decodes that to zeros), so
 * `active === false` was treated as "no such card". A 404 is the damaging answer
 * here: Next caches notFound() as a permanent not-found page for a real card.
 */
const ZEROED = {
  cardId: 0n,
  rarity: 0,
  cardType: 0,
  atkBase: 0,
  defBase: 0,
  spdBase: 0,
  hpBase: 0,
  supplyCap: 0n,
  minted: 0n,
  active: false,
};

function mockViem(getTemplate: () => unknown, maxCardId = 1000n) {
  vi.doMock("../src/config/viem", () => ({
    publicClient: {
      readContract: vi.fn(
        async ({ functionName }: { functionName: string }) => {
          if (functionName === "maxCardId") return maxCardId;
          if (functionName === "getTemplate") return getTemplate();
          if (functionName === "totalPools") throw new Error("429");
          throw new Error(`unexpected: ${functionName}`);
        },
      ),
      multicall: vi.fn(async () => []),
    },
  }));
}

describe("getCardDetail when getTemplate comes back empty", () => {
  it("reports an upstream failure, not 404, for an id inside the registered range", async () => {
    vi.resetModules();
    mockViem(() => ZEROED, 1000n);
    const { getCardDetail } = await import("../src/services/cardService");

    const error = (await getCardDetail(5).catch((e: unknown) => e)) as {
      status: number;
      code: string;
    };

    expect(error.status).toBe(503);
    expect(error.code).toBe("RPC_ERROR");
  });

  it("still 404s for an id beyond maxCardId", async () => {
    vi.resetModules();
    mockViem(() => ZEROED, 1000n);
    const { getCardDetail } = await import("../src/services/cardService");

    const error = (await getCardDetail(4242).catch((e: unknown) => e)) as {
      status: number;
    };

    expect(error.status).toBe(404);
  });
});
