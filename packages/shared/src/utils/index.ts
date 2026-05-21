import { RARITY_COLORS } from "../constants/index";
import type { Address, CardRarity } from "../types/index";

/** Truncates an address to 0x1234…abcd format */
export function formatAddress(addr: Address): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Formats a SHARD amount from wei (18 decimals) to a readable string */
export function formatShard(amount: bigint): string {
  const whole = amount / 10n ** 18n;
  const frac = (amount % 10n ** 18n) / 10n ** 14n;
  return `${whole.toLocaleString()}.${frac.toString().padStart(4, "0")} SHARD`;
}

/** Formats a VEIL amount from wei (18 decimals) to a readable string */
export function formatVeil(amount: bigint): string {
  const whole = amount / 10n ** 18n;
  const frac = (amount % 10n ** 18n) / 10n ** 14n;
  return `${whole.toLocaleString()}.${frac.toString().padStart(4, "0")} VEIL`;
}

/** Parses a decimal string like "100.5" into wei bigint. Throws on invalid input. */
export function parseShardInput(input: string): bigint {
  const trimmed = input.trim();
  if (!trimmed || trimmed.startsWith("-"))
    throw new Error(`Invalid amount: ${input}`);
  const [whole = "0", frac = ""] = trimmed.split(".");
  const fracPadded = frac.slice(0, 18).padEnd(18, "0");
  return BigInt(whole || "0") * 10n ** 18n + BigInt(fracPadded);
}

/** Returns Tailwind classes for rarity glow effect */
export function getRarityClass(rarity: CardRarity): string {
  return RARITY_COLORS[rarity];
}
