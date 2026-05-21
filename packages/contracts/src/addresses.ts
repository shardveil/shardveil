import type { Address } from "@shardveil/shared";

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const ARBITRUM_ONE_CHAIN_ID = 42161;

/** Chain IDs that have live contract deployments. */
export type SupportedChainId = typeof ARBITRUM_SEPOLIA_CHAIN_ID;

/**
 * Returns the contract addresses for a chain with a live deployment.
 * Accepts only `SupportedChainId` values, so callers never receive
 * `Address | null` and are not required to narrow the result.
 */
export function getAddresses(chainId: SupportedChainId) {
  return addresses[chainId];
}

export const addresses = {
  [ARBITRUM_SEPOLIA_CHAIN_ID]: {
    shardToken: "0xC774697DABaC34A7509b4E29F774D535ff03Bb6C" as Address,
    veilToken: "0x1e7be5DDAc6387f5b07857DA61c4A197741cB68d" as Address,
    cardNFT: "0xbCc261B0f6c8A370b5d35532ABfAaa4958B02Db2" as Address,
    cardRegistry: "0x6280a634aC9f6B96D3314De3060F30dC7AA9D17e" as Address,
    ammMarketplace: "0x39dE07c046EE5F66458a0a6e7Ae87e12481e5f87" as Address,
    battleEngine: "0x58208A44968B31DB1C7fFb107f67E0e458C091BA" as Address,
    guildSystem: "0x70A9c174B3a17FFa39910C92535374608571C03D" as Address,
    packContract: "0x4Acd78b844Cb39223C53c7B03086556b005a8E07" as Address,
    treasury: "0x7e78ac2d7EA123f86C6562BaaEC35ec94928eFDc" as Address,
    craftingEngine: "0xC711301D09dcD1ba8F3BAb0A0a0D14266532Bd17" as Address,
  },
  [ARBITRUM_ONE_CHAIN_ID]: {
    // Stub — filled in Phase K (mainnet launch)
    shardToken: null,
    veilToken: null,
    cardNFT: null,
    cardRegistry: null,
    ammMarketplace: null,
    battleEngine: null,
    guildSystem: null,
    packContract: null,
    treasury: null,
    craftingEngine: null,
  },
} as const;
