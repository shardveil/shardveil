import { http } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import { type Config, cookieStorage, createConfig, createStorage } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

import { defaultChain, secondaryChain } from "@/lib/chains";

// Resolve WalletConnect project ID from env.
// Guard: only include walletConnect connector when a project ID is provided —
// passing an empty string silently fails at connection time.
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [
  injected(),
  ...(walletConnectProjectId
    ? [walletConnect({ projectId: walletConnectProjectId })]
    : []),
  coinbaseWallet({ appName: "ShardVeil" }),
];

export const wagmiConfig: Config = createConfig({
  chains: [defaultChain, secondaryChain],
  connectors,
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [arbitrumSepolia.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL_421614 ??
        "https://sepolia-rollup.arbitrum.io/rpc",
    ),
    [arbitrum.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL_42161 ?? "https://arb1.arbitrum.io/rpc",
    ),
  },
});
