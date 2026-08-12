import "dotenv/config";

import { z } from "zod";

/**
 * The pinned card metadata document: a 1000-entry JSON array of {cardId, name}.
 * CardRegistry stores no names, so this is the only source of card titles.
 */
const CARD_METADATA_CID_DEFAULT =
  "bafkreia2rdv46bwhvqagotelbr7tp5udjlsmsocnt4vcm6ybrzdzwttpfy";

/**
 * Environment variables schema for ShardVeil API.
 * All variables are validated at server boot.
 * If validation fails, the process exits immediately with a detailed error message.
 */

const envSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  // Database (PostgreSQL via Prisma)
  DATABASE_URL: z.string().url(),

  // Redis (BullMQ job queues)
  REDIS_URL: z.string().url(),

  // JWT / Auth
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, "JWT_EXPIRES_IN must be like 7d, 24h, 3600s"),

  // Ethereum / EVM (on-chain features)
  // Arbitrum Sepolia testnet RPC. The API is bound to Sepolia — see
  // ACTIVE_CHAIN_ID in config/viem. A mainnet RPC gets added back next to the
  // ARBITRUM_ONE address map, not before it.
  ARBITRUM_SEPOLIA_RPC_URL: z.string().url(),

  // Private keys for transaction signing
  // Format: 0x-prefixed 64 hex characters (256 bits)
  // Optional in dev/test environments, but typed strictly
  SETTLER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "Must be 0x-prefixed 64 hex characters")
    .optional(),

  WAR_ORACLE_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "Must be 0x-prefixed 64 hex characters")
    .optional(),

  TOURNAMENT_ORACLE_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "Must be 0x-prefixed 64 hex characters")
    .optional(),

  XP_ORACLE_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/, "Must be 0x-prefixed 64 hex characters")
    .optional(),

  // Frontend
  FRONTEND_URL: z.string().url(),

  // IPFS
  IPFS_GATEWAY_URL: z.string().url(),

  // Pinned JSON array of card display names, keyed by cardId.
  //
  // Defaulted rather than required: a CID is public, immutable, content-addressed
  // data, not a secret, and leaving it unset silently degraded every card to
  // "Card #N". Override the env var when the document is re-pinned.
  CARD_METADATA_CID: z.preprocess(
    (v) => (v === "" || v === undefined ? CARD_METADATA_CID_DEFAULT : v),
    z.string().min(1),
  ),

  // Pinata (IPFS pinning service)
  PINATA_JWT: z.string().min(1),

  // Sentry (error tracking) - optional
  SENTRY_DSN: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url().optional(),
  ),

  // Toxic words list - optional
  TOXIC_WORDS_LIST_URL: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().url().optional(),
  ),
});

type Env = z.infer<typeof envSchema>;

/**
 * Validate and export the environment variables.
 * Fails fast at boot if any required variable is missing or malformed.
 */
function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages: string[] = [];

    for (const [field, messages] of Object.entries(errors)) {
      if (messages && messages.length > 0) {
        errorMessages.push(`  ${field}: ${messages.join(", ")}`);
      }
    }

    console.error(
      "Environment validation failed. Missing or invalid variables:\n" +
        errorMessages.join("\n"),
    );

    process.exit(1);
  }

  return result.data;
}

/**
 * Parsed and validated environment variables.
 * All downstream code should import `env` from this module, never from process.env directly.
 */
export const env = parseEnv();
