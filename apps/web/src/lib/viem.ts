import { createPublicClient, http } from "viem";
import { arbitrum } from "viem/chains";

import { defaultChain } from "@/lib/chains";

const rpcUrl =
  defaultChain.id === arbitrum.id
    ? (process.env.NEXT_PUBLIC_RPC_URL_42161 ?? "https://arb1.arbitrum.io/rpc")
    : (process.env.NEXT_PUBLIC_RPC_URL_421614 ??
      "https://sepolia-rollup.arbitrum.io/rpc");

/**
 * Public viem client for non-wagmi read operations (e.g., server-side metadata
 * enrichment). Uses env-configured RPC URL for the active chain.
 */
export const publicClient = createPublicClient({
  chain: defaultChain,
  transport: http(rpcUrl),
});

export { defaultChain as activeChain };
