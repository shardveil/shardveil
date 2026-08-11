import { defineChain } from "viem";

export const arbitrum = defineChain({
  id: 42161,
  name: "Arbitrum One",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL_42161 ?? "https://arb1.arbitrum.io/rpc",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://arbiscan.io",
    },
  },
});

export const arbitrumSepolia = defineChain({
  id: 421614,
  name: "Arbitrum Sepolia",
  nativeCurrency: {
    name: "Arbitrum Sepolia Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_RPC_URL_421614 ??
          "https://sepolia-rollup.arbitrum.io/rpc",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Arbiscan Sepolia",
      url: "https://sepolia.arbiscan.io",
    },
  },
  testnet: true,
});

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID);

export const defaultChain =
  chainId === arbitrum.id ? arbitrum : arbitrumSepolia;

export const secondaryChain =
  defaultChain.id === arbitrumSepolia.id ? arbitrum : arbitrumSepolia;
