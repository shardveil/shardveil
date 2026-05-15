import type { Address } from "@shardveil/shared";

export const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
export const ARBITRUM_ONE_CHAIN_ID = 42161;

export const addresses = {
  [ARBITRUM_SEPOLIA_CHAIN_ID]: {
    shardToken: "0x46c08085f5871626EB61964B1E251F74F307d22b" as Address,
    veilToken: "0xE09a03965f3314C4773f48a9dB8949934414D3f8" as Address,
    cardNFT: "0x6d933be6C432Ae8F119FD6070B43A8754B55376A" as Address,
    cardRegistry: "0xAA7169B5F674721Fe1d26974D947ab95C00945A9" as Address,
    ammMarketplace: "0x535326c6fC4A2be86e3dA8A8a56Bf7FBa180Fce9" as Address,
    battleEngine: "0xd6D952A313fED1999Cd5d3b3CBFDA7f7B1BE478F" as Address,
    guildSystem: "0x6e56e98ed9551e9cd1a5FB36c3B1E6259D3940C4" as Address,
    packContract: "0x6dD9E517BEC91F5F22005a361C7754042c20D75d" as Address,
    treasury: "0xE13905d27C104507C7Cc2626c48E564cF80097F5" as Address,
    craftingEngine: "0x78B28212bf2835Bd8fFaeD14402BE0F9075C1d75" as Address,
  },
  [ARBITRUM_ONE_CHAIN_ID]: {
    // Stub — filled in Phase K (mainnet launch)
    shardToken: null,
    veilToken: null,
    cardNFT: null,
    cardRegistry: null,
    ammMarketplace: null,
    battleEngine: null,
    guildSystem: null,
    packContract: null,
    treasury: null,
    craftingEngine: null,
  },
} as const;
