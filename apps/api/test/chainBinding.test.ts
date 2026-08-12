/**
 * Chain / address-book coherence.
 *
 * The deployed API spent time reading Sepolia contract addresses over an
 * Arbitrum One RPC: publicClient picked its chain from NODE_ENV while every
 * getAddresses() call was pinned to Sepolia. eth_call against an address with
 * no code returns empty rather than reverting, so this surfaced as "card not
 * found" and an empty marketplace instead of an error.
 *
 * Nothing asserted the two agreed, which is why it survived. These do.
 *
 * setup.ts mocks config/viem globally, so these load the real module.
 */

import { getAddresses } from "@shardveil/contracts";
import { describe, expect, it, vi } from "vitest";

import type * as ViemConfig from "../src/config/viem";

async function realViemConfig(): Promise<typeof ViemConfig> {
  return vi.importActual<typeof ViemConfig>("../src/config/viem");
}

describe("chain binding", () => {
  it("publicClient talks to the chain the addresses are keyed by", async () => {
    const { publicClient, ACTIVE_CHAIN_ID } = await realViemConfig();

    expect(publicClient.chain?.id).toBe(ACTIVE_CHAIN_ID);
  });

  it("every contract in the active chain's address book is deployed", async () => {
    const { ACTIVE_CHAIN_ID } = await realViemConfig();
    const addresses = getAddresses(ACTIVE_CHAIN_ID);

    // Guards the mainnet migration: flipping ACTIVE_CHAIN_ID before filling in
    // the ARBITRUM_ONE map would otherwise hand every caller a null address
    // and fail at runtime, one contract at a time.
    const unset = Object.entries(addresses)
      .filter(([, address]) => !address)
      .map(([name]) => name);

    expect(unset).toEqual([]);
  });

  it("getContract resolves through the same address book", async () => {
    const { getContract, ACTIVE_CHAIN_ID } = await realViemConfig();
    const addresses = getAddresses(ACTIVE_CHAIN_ID);

    expect(getContract("cardRegistry").address).toBe(addresses.cardRegistry);
    expect(getContract("ammMarketplace").address).toBe(
      addresses.ammMarketplace,
    );
  });

  it("stays on the active chain under NODE_ENV=production", async () => {
    // The regression this file exists for only ever appeared in production:
    // the old code read `NODE_ENV === "production" ? arbitrum : arbitrumSepolia`,
    // so under the test env it picked the right chain and looked fine. Stub
    // production explicitly or this asserts nothing.
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();

    try {
      const { publicClient, ACTIVE_CHAIN_ID } = await realViemConfig();
      expect(publicClient.chain?.id).toBe(ACTIVE_CHAIN_ID);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
