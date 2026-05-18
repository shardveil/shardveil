import { http } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import { type Config, cookieStorage, createConfig, createStorage } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

// Resolve WalletConnect project ID from env
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

// Determine default chain from env (defaults to Arbitrum Sepolia testnet)
const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 421614);
const defaultChain = chainId === 42161 ? arbitrum : arbitrumSepolia;
const secondaryChain =
  defaultChain === arbitrumSepolia ? arbitrum : arbitrumSepolia;

export const wagmiConfig: Config = createConfig({
  chains: [defaultChain, secondaryChain],
  connectors: [
    injected(),
    walletConnect({ projectId: walletConnectProjectId }),
    coinbaseWallet({ appName: "ShardVeil" }),
  ],
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

export { cookieStorage };
