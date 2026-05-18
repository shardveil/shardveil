import { createPublicClient, http } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";

// Determine the active chain from env (defaults to Arbitrum Sepolia testnet)
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 421614);
const activeChain = chainId === 42161 ? arbitrum : arbitrumSepolia;

const rpcUrl =
  activeChain.id === 42161
    ? (process.env.NEXT_PUBLIC_RPC_URL_42161 ?? "https://arb1.arbitrum.io/rpc")
    : (process.env.NEXT_PUBLIC_RPC_URL_421614 ??
      "https://sepolia-rollup.arbitrum.io/rpc");

/**
 * Public viem client for non-wagmi read operations (e.g., server-side metadata
 * enrichment). Uses env-configured RPC URL for the active chain.
 */
export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(rpcUrl),
});

export { activeChain };
