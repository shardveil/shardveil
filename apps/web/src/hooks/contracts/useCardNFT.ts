"use client";

import {
  addresses,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  cardNftAbi,
} from "@shardveil/contracts";
import type {
  ContractEventName,
  ContractFunctionArgs,
  ContractFunctionName,
} from "viem";
import {
  useReadContract,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";
import { useChainId } from "wagmi";

const abi = cardNftAbi;
type ContractAbi = typeof abi;

function useContractAddress() {
  const chainId = useChainId();
  return chainId === ARBITRUM_SEPOLIA_CHAIN_ID
    ? addresses[ARBITRUM_SEPOLIA_CHAIN_ID].cardNFT
    : undefined;
}

export function useCardNFTRead<
  TFunctionName extends ContractFunctionName<ContractAbi, "pure" | "view">,
>({
  functionName,
  args,
  enabled = true,
}: {
  functionName: TFunctionName;
  args?: ContractFunctionArgs<ContractAbi, "pure" | "view", TFunctionName>;
  enabled?: boolean;
}) {
  const address = useContractAddress();
  return useReadContract({
    abi,
    address: address as `0x${string}`,
    functionName,
    args: args as never,
    query: { enabled: enabled && !!address },
  } as unknown as Parameters<typeof useReadContract>[0]);
}

export function useCardNFTWrite() {
  const address = useContractAddress();
  const { writeContractAsync, isPending, error } = useWriteContract();

  const execute = async <
    TFunctionName extends ContractFunctionName<
      ContractAbi,
      "nonpayable" | "payable"
    >,
  >(
    functionName: TFunctionName,
    args: ContractFunctionArgs<
      ContractAbi,
      "nonpayable" | "payable",
      TFunctionName
    >,
    value?: bigint,
  ): Promise<`0x${string}`> => {
    if (!address) throw new Error("Contract not available on this network");
    if (value !== undefined) {
      return writeContractAsync({
        abi,
        address,
        functionName,
        args: args as never,
        value,
      } as unknown as Parameters<typeof writeContractAsync>[0]);
    }
    return writeContractAsync({
      abi,
      address,
      functionName,
      args: args as never,
    } as unknown as Parameters<typeof writeContractAsync>[0]);
  };

  return { execute, isPending, error: error as Error | null };
}

export function useCardNFTEvents<
  TEventName extends ContractEventName<ContractAbi>,
>({
  eventName,
  onLogs,
  enabled = true,
}: {
  eventName: TEventName;
  onLogs: (logs: unknown[]) => void;
  enabled?: boolean;
}) {
  const address = useContractAddress();
  useWatchContractEvent({
    abi,
    address,
    eventName,
    onLogs,
    enabled: enabled && !!address,
  });
}

export { cardNftAbi as CardNFTAbi };
export type { ContractAbi as CardNFTContractAbi };
