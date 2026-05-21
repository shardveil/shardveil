import "dotenv/config";

import { z } from "zod";

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
  // Arbitrum mainnet RPC
  ARBITRUM_RPC_URL: z.string().url(),

  // Arbitrum Sepolia testnet RPC
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
