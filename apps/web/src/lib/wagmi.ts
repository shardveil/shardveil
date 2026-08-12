import {
  ARBITRUM_RPC_FALLBACKS,
  ARBITRUM_SEPOLIA_RPC_FALLBACKS,
} from "@shardveil/shared";
import { fallback, http } from "wagmi";
import { cookieStorage, createConfig, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";

import {
  arbitrum,
  arbitrumSepolia,
  defaultChain,
  secondaryChain,
} from "@/lib/chains";

/**
 * Any configured endpoint first, then the public fallbacks.
 *
 * A single http() transport meant one throttled host broke the read outright —
 * reading packConfigs from the browser failed with "Failed to fetch" while the
 * pack page was mid-purchase. fallback() rolls over to the next endpoint instead.
 */
function transportFor(
  configured: string | undefined,
  fallbacks: readonly string[],
) {
  const urls = [configured, ...fallbacks].filter(
    (url): url is string => typeof url === "string" && url.length > 0,
  );

  // De-duplicate so a configured URL that equals a fallback is not tried twice.
  return fallback(
    [...new Set(urls)].map((url) => http(url, { retryCount: 2 })),
    { rank: false },
  );
}

export const wagmiConfig = createConfig({
  chains: [defaultChain, secondaryChain],
  connectors: [
    injected({
      target: "metaMask",
    }),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [arbitrum.id]: transportFor(
      process.env.NEXT_PUBLIC_RPC_URL_42161,
      ARBITRUM_RPC_FALLBACKS,
    ),
    [arbitrumSepolia.id]: transportFor(
      process.env.NEXT_PUBLIC_RPC_URL_421614,
      ARBITRUM_SEPOLIA_RPC_FALLBACKS,
    ),
  },
});
