import { arbitrum, arbitrumSepolia } from "viem/chains";

export const defaultChain =
  Number(process.env.NEXT_PUBLIC_CHAIN_ID) === 42161
    ? arbitrum
    : arbitrumSepolia;

export const secondaryChain =
  defaultChain.id === arbitrumSepolia.id ? arbitrum : arbitrumSepolia;
