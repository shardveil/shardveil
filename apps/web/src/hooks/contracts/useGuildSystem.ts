"use client";

import {
  addresses,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  guildSystemAbi,
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

const abi = guildSystemAbi;
type ContractAbi = typeof abi;

function useContractAddress() {
  const chainId = useChainId();
  return chainId === ARBITRUM_SEPOLIA_CHAIN_ID
    ? addresses[ARBITRUM_SEPOLIA_CHAIN_ID].guildSystem
    : undefined;
}

export function useGuildSystemRead<
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

export function useGuildSystemWrite() {
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

export function useGuildSystemEvents<
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

export { guildSystemAbi as GuildSystemAbi };
export type { ContractAbi as GuildSystemContractAbi };
