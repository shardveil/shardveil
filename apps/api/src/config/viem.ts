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
import {
  type Address,
  createPublicClient,
  createWalletClient,
  getContract as viemGetContract,
  type Hash,
  type Hex,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrum, arbitrumSepolia } from "viem/chains";

import { env } from "./env";

/**
 * Re-export commonly used viem types
 */
export type { Address, Hash, Hex };

/**
 * Select chain and RPC URL based on NODE_ENV.
 * Production → Arbitrum One
 * Dev/test → Arbitrum Sepolia
 */
const chain = env.NODE_ENV === "production" ? arbitrum : arbitrumSepolia;
const rpcUrl =
  env.NODE_ENV === "production"
    ? env.ARBITRUM_RPC_URL
    : env.ARBITRUM_SEPOLIA_RPC_URL;

/**
 * Public client for read-only operations (getBlockNumber, call, simulate, etc.)
 */
export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
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
 * Always uses ARBITRUM_SEPOLIA addresses for now (Arbitrum One addresses are null).
 * Returns a contract instance bound to publicClient for read-only operations.
 *
 * @param name - Contract name (e.g., 'cardRegistry', 'shardToken')
 * @returns viem contract instance
 */
export function getContract(
  name: ContractName,
): ReturnType<typeof viemGetContract> {
  const addresses = getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID);
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
