import type { MiddlewareHandler } from "hono";

import {
  ammMarketplaceAbi,
  ARBITRUM_SEPOLIA_CHAIN_ID,
  battleEngineAbi,
  cardNftAbi,
  cardRegistryAbi,
  craftingEngineAbi,
  guildSystemAbi,
  getAddresses,
  packContractAbi,
  shardTokenAbi,
  treasuryAbi,
  veilTokenAbi,
} from "@shardveil/contracts";

import { logger } from "../config/logger";
import { publicClient } from "../config/viem";
import { cacheService } from "../services/cacheService";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";

/**
 * Map of contract names to their ABIs and addresses.
 * Used by requireRole to resolve role hashes and check permissions on-chain.
 */
const CONTRACT_ABI_MAP = {
  cardRegistry: { abi: cardRegistryAbi, address: getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID).cardRegistry },
  guildSystem: { abi: guildSystemAbi, address: getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID).guildSystem },
  ammMarketplace: { abi: ammMarketplaceAbi, address: getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID).ammMarketplace },
  battleEngine: { abi: battleEngineAbi, address: getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID).battleEngine },
  shardToken: { abi: shardTokenAbi, address: getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID).shardToken },
  veilToken: { abi: veilTokenAbi, address: getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID).veilToken },
  cardNFT: { abi: cardNftAbi, address: getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID).cardNFT },
  packContract: { abi: packContractAbi, address: getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID).packContract },
  treasury: { abi: treasuryAbi, address: getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID).treasury },
  craftingEngine: { abi: craftingEngineAbi, address: getAddresses(ARBITRUM_SEPOLIA_CHAIN_ID).craftingEngine },
} as const;

type AdminContractName = keyof typeof CONTRACT_ABI_MAP;

/**
 * List of well-known AccessControl role names that can be resolved on-chain.
 * These are function names that return bytes32 role hashes.
 */
const WELL_KNOWN_ROLES = new Set([
  "DEFAULT_ADMIN_ROLE",
  "MINTER_ROLE",
  "UPGRADER_ROLE",
  "PROTOCOL_ROLE",
]);

/**
 * Check if a string is a valid bytes32 hex value.
 *
 * @param value — string to check
 * @returns true if value is a valid 32-byte hex (0x + 64 hex digits), false otherwise
 */
function isRawHex(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Resolve a well-known role name to its bytes32 hash by calling the contract.
 *
 * @param contractAddress — contract address
 * @param abi — contract ABI
 * @param roleName — role name (e.g., "DEFAULT_ADMIN_ROLE")
 * @returns bytes32 role hash
 * @throws ForbiddenError if the call fails
 */
async function resolveRoleHash(
  contractAddress: `0x${string}`,
  abi: unknown,
  roleName: string,
): Promise<`0x${string}`> {
  try {
    const roleHash = await publicClient.readContract({
      address: contractAddress,
      abi: abi as any,
      functionName: roleName as any,
    }) as `0x${string}`;

    return roleHash;
  } catch (err) {
    logger.error(
      {
        error: err instanceof Error ? err.message : String(err),
        contractAddress,
        roleName,
      },
      "Failed to resolve role hash on-chain",
    );
    throw new ForbiddenError("Role check failed");
  }
}

/**
 * Check if an address has a specific role on a contract.
 *
 * @param contractAddress — contract address
 * @param abi — contract ABI
 * @param roleHash — bytes32 role hash
 * @param address — wallet address to check
 * @returns true if the address has the role, false otherwise
 * @throws ForbiddenError if the call fails
 */
async function checkRole(
  contractAddress: `0x${string}`,
  abi: unknown,
  roleHash: `0x${string}`,
  address: `0x${string}`,
): Promise<boolean> {
  try {
    const hasRole = await publicClient.readContract({
      address: contractAddress,
      abi: abi as any,
      functionName: "hasRole",
      args: [roleHash, address],
    }) as boolean;

    return hasRole;
  } catch (err) {
    logger.error(
      {
        error: err instanceof Error ? err.message : String(err),
        contractAddress,
        roleHash,
        address,
      },
      "Failed to check role on-chain",
    );
    throw new ForbiddenError("Role check failed");
  }
}

/**
 * Hono middleware: Requires the authenticated user to have a specific role on a contract.
 *
 * Behavior:
 * 1. Reads c.get('address') — the authenticated wallet address (must be after requireAuth)
 * 2. If role is a well-known role name (e.g., 'DEFAULT_ADMIN_ROLE'):
 *    - Calls the contract to resolve the role hash
 *    - Caches the hash under 'admin:rolehash:{contractName}:{role}' for 1h
 * 3. Calls hasRole(roleHash, address) on-chain
 * 4. Caches the result under 'admin:role:{address}:{contractName}:{role}' for 30s
 * 5. If hasRole returns false → throws ForbiddenError("Insufficient role")
 * 6. If hasRole returns true → calls next()
 *
 * Usage:
 * ```ts
 * app.post('/api/admin/cards', requireAuth, requireRole('cardRegistry', 'MINTER_ROLE'), handler)
 * ```
 *
 * @param contractName — contract name (key in CONTRACT_ABI_MAP)
 * @param role — role name (e.g., 'DEFAULT_ADMIN_ROLE') or raw bytes32 hex
 * @returns Hono MiddlewareHandler
 */
export const requireRole = (
  contractName: AdminContractName,
  role: string,
): MiddlewareHandler => {
  return async (c, next) => {
    // Get authenticated address from context
    const address = c.get("address");
    if (!address) {
      throw new UnauthorizedError("Not authenticated");
    }

    // Validate contract name
    const contractConfig = CONTRACT_ABI_MAP[contractName];
    if (!contractConfig) {
      throw new ForbiddenError("Unknown contract");
    }

    const { abi, address: contractAddress } = contractConfig;

    try {
      // Step 1: Resolve role hash (cache for 1h)
      let roleHash: `0x${string}`;

      if (isRawHex(role)) {
        // Raw hex role hash — use as-is
        roleHash = role as `0x${string}`;
      } else {
        // Well-known role name — enforce allowlist and resolve from contract
        if (!WELL_KNOWN_ROLES.has(role)) {
          throw new ForbiddenError("Unknown role");
        }
        roleHash = await cacheService.getOrSet(
          `admin:rolehash:${contractName}:${role}`,
          3600, // 1 hour — role hashes never change
          async () => {
            return resolveRoleHash(contractAddress, abi, role);
          },
        );
      }

      // Step 2: Check role (cache for 30s)
      const hasRole = await cacheService.getOrSet(
        `admin:role:${address}:${contractName}:${role}`,
        30, // 30 seconds
        async () => {
          return checkRole(contractAddress, abi, roleHash, address);
        },
      );

      if (!hasRole) {
        throw new ForbiddenError("Insufficient role");
      }

      // User has the role — proceed to next handler
      await next();
    } catch (err) {
      // Re-throw known errors, wrap others
      if (err instanceof ForbiddenError) {
        throw err;
      }

      logger.error(
        {
          error: err instanceof Error ? err.message : String(err),
          address,
          contractName,
          role,
        },
        "Unexpected error in role check",
      );
      throw new ForbiddenError("Role check failed");
    }
  };
};
