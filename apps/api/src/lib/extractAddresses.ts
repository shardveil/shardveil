/**
 * Shared address extraction helper for the event indexer worker and backfill
 * script.
 *
 * Given a contract name + event name + decoded log args, returns the list of
 * player addresses that should be notified (empty for system-level events or
 * events that have no meaningful per-user recipients).
 */

// Zero address constant — used to filter out mint/burn pseudo-addresses.
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function extractAddresses(
  contractName: string,
  eventName: string,
  args: Record<string, unknown>,
): string[] {
  const addr = (v: unknown): string | null => {
    if (typeof v === "string" && v !== ZERO_ADDRESS) return v;
    return null;
  };

  switch (`${contractName}:${eventName}`) {
    case "packContract:PackFulfilled": {
      const a = addr(args["player"] ?? args["buyer"]);
      return a ? [a] : [];
    }
    case "battleEngine:MatchSettled": {
      const a = addr(args["winner"]);
      return a ? [a] : [];
    }
    case "craftingEngine:FusionCrafted": {
      const a = addr(args["player"]);
      return a ? [a] : [];
    }
    case "ammMarketplace:CardBought": {
      const a = addr(args["buyer"]);
      return a ? [a] : [];
    }
    case "ammMarketplace:CardSold": {
      const a = addr(args["seller"]);
      return a ? [a] : [];
    }
    case "ammMarketplace:LiquidityAdded":
    case "ammMarketplace:LiquidityRemoved": {
      const a = addr(args["provider"]);
      return a ? [a] : [];
    }
    case "guildSystem:GuildCreated": {
      const a = addr(args["master"]);
      return a ? [a] : [];
    }
    case "guildSystem:MemberJoined":
    case "guildSystem:MemberLeft": {
      const a = addr(args["member"]);
      return a ? [a] : [];
    }
    case "guildSystem:GuildWarResult":
    case "treasury:BuybackTriggered": {
      return [];
    }
    case "veilToken:Transfer":
    case "shardToken:Transfer": {
      const results: string[] = [];
      const f = addr(args["from"]);
      const t = addr(args["to"]);
      if (f) results.push(f);
      if (t) results.push(t);
      return results;
    }
    case "cardNFT:TransferSingle":
    case "cardNFT:TransferBatch": {
      const results: string[] = [];
      const f = addr(args["from"]);
      const t = addr(args["to"]);
      if (f) results.push(f);
      if (t) results.push(t);
      return results;
    }
    default:
      return [];
  }
}
