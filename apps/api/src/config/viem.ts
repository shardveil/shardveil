import {
  ammMarketplaceAbi,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  battleEngineAbi,
  cardNftAbi,
  cardRegistryAbi,
  craftingEngineAbi,
  getAddresses,
  guildSystemAbi,
  packContractAbi,
  shardTokenAbi,
  treasuryAbi,
  veilTokenAbi,
} from "@shardveil/contracts";
import { ARBITRUM_SEPOLIA_RPC_FALLBACKS } from "@shardveil/shared";
import {
  type Address,
  createPublicClient,
  createWalletClient,
  fallback,
  getContract as viemGetContract,
  type Hash,
  type Hex,
  http,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";

import { env } from "./env";

/**
 * Re-export commonly used viem types
 */
export type { Address, Hash, Hex };

/**
 * The chain this deployment is bound to — the single source for both the RPC
 * transport below and every `getAddresses()` call in the API.
 *
 * Chain and addresses have to move together. Selecting the chain from
 * NODE_ENV, as this used to, put the deployed API on Arbitrum One (render.yaml
 * sets NODE_ENV=production) while every read still used the Sepolia address
 * book, where those addresses have no code — so contract reads came back empty
 * rather than failing, and read as "no cards" / "empty marketplace".
 *
 * Mainnet launch: fill in the ARBITRUM_ONE map in packages/contracts, widen
 * SupportedChainId, and change this one line.
 */
export const ACTIVE_CHAIN_ID = ARBITRUM_SEPOLIA_CHAIN_ID;

const chain = arbitrumSepolia;
const rpcUrl = env.ARBITRUM_SEPOLIA_RPC_URL;

/**
 * Public client for read-only operations (getBlockNumber, call, simulate, etc.)
 */
export const publicClient: PublicClient = createPublicClient({
  chain,
  // Configured endpoint first, then public fallbacks. A single transport meant a
  // throttled host produced empty eth_call results, which read as "card not
  // found" and as an empty marketplace. fallback() rolls over instead.
  transport: fallback(
    [...new Set([rpcUrl, ...ARBITRUM_SEPOLIA_RPC_FALLBACKS])].map((url) =>
      http(url, { retryCount: 2 }),
    ),
    { rank: false },
  ),
});

/**
 * Lazy factory for settler wallet. Only instantiate if env.SETTLER_PRIVATE_KEY is set.
 * Throws if private key is not configured.
 */
export function settlerWallet() {
  if (!env.SETTLER_PRIVATE_KEY) {
    throw new Error("SETTLER_PRIVATE_KEY not configured");
  }
  return createWalletClient({
    account: privateKeyToAccount(env.SETTLER_PRIVATE_KEY as `0x${string}`),
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * Lazy factory for war oracle wallet. Only instantiate if env.WAR_ORACLE_PRIVATE_KEY is set.
 * Throws if private key is not configured.
 */
export function warOracleWallet() {
  if (!env.WAR_ORACLE_PRIVATE_KEY) {
    throw new Error("WAR_ORACLE_PRIVATE_KEY not configured");
  }
  return createWalletClient({
    account: privateKeyToAccount(env.WAR_ORACLE_PRIVATE_KEY as `0x${string}`),
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * Lazy factory for tournament oracle wallet. Only instantiate if env.TOURNAMENT_ORACLE_PRIVATE_KEY is set.
 * Throws if private key is not configured.
 */
export function tournamentOracleWallet() {
  if (!env.TOURNAMENT_ORACLE_PRIVATE_KEY) {
    throw new Error("TOURNAMENT_ORACLE_PRIVATE_KEY not configured");
  }
  return createWalletClient({
    account: privateKeyToAccount(
      env.TOURNAMENT_ORACLE_PRIVATE_KEY as `0x${string}`,
    ),
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * Lazy factory for XP oracle wallet. Only instantiate if env.XP_ORACLE_PRIVATE_KEY is set.
 * Throws if private key is not configured.
 */
export function xpOracleWallet() {
  if (!env.XP_ORACLE_PRIVATE_KEY) {
    throw new Error("XP_ORACLE_PRIVATE_KEY not configured");
  }
  return createWalletClient({
    account: privateKeyToAccount(env.XP_ORACLE_PRIVATE_KEY as `0x${string}`),
    chain,
    transport: http(rpcUrl),
  });
}

/**
 * Map of contract names to their ABIs
 */
const CONTRACT_ABIS = {
  cardRegistry: cardRegistryAbi,
  shardToken: shardTokenAbi,
  veilToken: veilTokenAbi,
  cardNFT: cardNftAbi,
  ammMarketplace: ammMarketplaceAbi,
  battleEngine: battleEngineAbi,
  guildSystem: guildSystemAbi,
  packContract: packContractAbi,
  treasury: treasuryAbi,
  craftingEngine: craftingEngineAbi,
} as const;

type ContractName = keyof typeof CONTRACT_ABIS;

/**
 * Helper to get a viem contract instance with ABI + address from @shardveil/contracts.
 * Bound to ACTIVE_CHAIN_ID, the same chain publicClient talks to.
 * Returns a contract instance bound to publicClient for read-only operations.
 *
 * @param name - Contract name (e.g., 'cardRegistry', 'shardToken')
 * @returns viem contract instance
 */
export function getContract(
  name: ContractName,
): ReturnType<typeof viemGetContract> {
  const addresses = getAddresses(ACTIVE_CHAIN_ID);
  const address = addresses[name];

  if (!address) {
    throw new Error(`Contract address not found for ${name}`);
  }

  return viemGetContract({
    address,
    abi: CONTRACT_ABIS[name],
    client: publicClient,
  });
}
