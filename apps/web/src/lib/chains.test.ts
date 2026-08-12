import { afterEach, describe, expect, it, vi } from "vitest";

const ARBITRUM_ONE = 42161;
const ARBITRUM_SEPOLIA = 421614;

/**
 * chains.ts reads NEXT_PUBLIC_CHAIN_ID at module scope, so each case needs a
 * fresh module registry after stubbing the env.
 */
async function loadChains(chainId: string | undefined) {
  vi.resetModules();
  if (chainId === undefined) {
    vi.stubEnv("NEXT_PUBLIC_CHAIN_ID", "");
  } else {
    vi.stubEnv("NEXT_PUBLIC_CHAIN_ID", chainId);
  }
  return import("./chains");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("defaultChain selection", () => {
  it("selects Arbitrum One when NEXT_PUBLIC_CHAIN_ID is 42161", async () => {
    const { defaultChain, secondaryChain } = await loadChains("42161");

    expect(defaultChain.id).toBe(ARBITRUM_ONE);
    expect(secondaryChain.id).toBe(ARBITRUM_SEPOLIA);
  });

  it("selects Arbitrum Sepolia when NEXT_PUBLIC_CHAIN_ID is 421614", async () => {
    const { defaultChain, secondaryChain } = await loadChains("421614");

    expect(defaultChain.id).toBe(ARBITRUM_SEPOLIA);
    expect(secondaryChain.id).toBe(ARBITRUM_ONE);
  });

  it("falls back to testnet when NEXT_PUBLIC_CHAIN_ID is unset", async () => {
    // Deployment hazard: a production build that forgets this variable points
    // every wallet interaction at Sepolia contracts without any warning.
    const { defaultChain } = await loadChains(undefined);

    expect(defaultChain.id).toBe(ARBITRUM_SEPOLIA);
    expect(defaultChain.testnet).toBe(true);
  });

  it("falls back to testnet when NEXT_PUBLIC_CHAIN_ID is not a number", async () => {
    const { defaultChain } = await loadChains("mainnet");

    expect(defaultChain.id).toBe(ARBITRUM_SEPOLIA);
  });

  it("never returns the same chain for default and secondary", async () => {
    for (const value of ["42161", "421614", "", "nonsense"]) {
      const { defaultChain, secondaryChain } = await loadChains(value);
      expect(defaultChain.id).not.toBe(secondaryChain.id);
    }
  });
});
