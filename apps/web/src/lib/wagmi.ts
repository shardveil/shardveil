import { http } from "wagmi";
import { cookieStorage, createConfig, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";

import {
  arbitrum,
  arbitrumSepolia,
  defaultChain,
  secondaryChain,
} from "@/lib/chains";

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
    [arbitrum.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL_42161 ?? arbitrum.rpcUrls.default.http[0],
    ),
    [arbitrumSepolia.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL_421614 ??
        arbitrumSepolia.rpcUrls.default.http[0],
    ),
  },
});
