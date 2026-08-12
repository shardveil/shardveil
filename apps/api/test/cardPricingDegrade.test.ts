import { describe, expect, it, vi } from "vitest";

/**
 * The card catalogue comes from CardRegistry. AMM pools only add buy/sell
 * prices, so an RPC failure reading pools must not take the catalogue with it.
 *
 * Regression: the public Arbitrum Sepolia RPC rate-limited the API and
 * getActivePools threw RPC_ERROR, so GET /cards/1 answered
 * {"error":{"code":"RPC_ERROR","message":"Failed to fetch marketplace pools"}}
 * for a card that was registered and perfectly renderable without a price.
 */
describe("card catalogue when the AMM RPC fails", () => {
  it("serves cards with poolId null instead of failing the request", async () => {
    vi.resetModules();

    const registryTemplate = {
      cardId: 1n,
      skillId: "0x00",
      supplyCap: 10_000,
      minted: 0,
      atkBase: 57,
      defBase: 55,
      spdBase: 54,
      hpBase: 220,
      cardType: 1,
      rarity: 0,
      active: true,
    };

    vi.doMock("../src/config/viem", () => ({
      publicClient: {
        readContract: vi.fn(
          async ({ functionName }: { functionName: string }) => {
            if (functionName === "maxCardId") return 1n;
            if (functionName === "getTemplate") return registryTemplate;
            // Every AMM read fails, as a rate-limited RPC does.
            if (functionName === "totalPools")
              throw new Error("429 Too Many Requests");
            throw new Error(`unexpected read: ${functionName}`);
          },
        ),
        multicall: vi.fn(async () => [
          { status: "success", result: registryTemplate },
        ]),
      },
    }));

    const { getAllTemplates } = await import("../src/services/cardService");

    const [templates] = await getAllTemplates();

    // The card is still served; it simply has no marketplace price.
    expect(templates.length).toBeGreaterThan(0);
    expect(templates[0]?.poolId).toBeNull();
  });
});
