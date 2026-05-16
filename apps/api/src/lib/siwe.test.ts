/**
 * Manual test/verification script for SIWE module.
 *
 * Run with: npx tsx src/lib/siwe.test.ts
 *
 * Verifies:
 * 1. Round-trip: build → sign with test key → verify returns valid
 * 2. Nonce can only be consumed once
 * 3. Tampered messages fail verification
 */

import { privateKeyToAccount, signMessage } from "viem/accounts";

import {
  buildMessage,
  consumeNonce,
  generateNonce,
  getDomain,
  verifySignature,
} from "./siwe";

// Test account with known private key (DO NOT use in production)
const TEST_PRIVATE_KEY =
  "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const testAccount = privateKeyToAccount(TEST_PRIVATE_KEY);
const testAddress = testAccount.address;

const FRONTEND_URL = "http://localhost:3000";
const CHAIN_ID = 42161; // Arbitrum

async function runTests() {
  console.log("🧪 Starting SIWE verification tests...\n");

  // Test 1: Round-trip (build → sign → verify)
  console.log("Test 1: Round-trip message signing and verification");
  try {
    const nonce = generateNonce();
    const domain = getDomain();
    const message = buildMessage(
      testAddress,
      nonce,
      domain,
      FRONTEND_URL,
      CHAIN_ID,
    );

    console.log("  ✓ Generated nonce:", nonce.substring(0, 16) + "...");
    console.log("  ✓ Domain:", domain);
    console.log("  ✓ Built message (" + message.length + " bytes)");

    // Sign the message
    const signature = await signMessage({
      account: testAccount,
      message,
    });
    console.log("  ✓ Signed message:", signature.substring(0, 20) + "...");

    // Verify the signature
    const result = await verifySignature(message, signature as `0x${string}`);
    if (result.valid && result.address === testAddress) {
      console.log("  ✓ Signature verified correctly");
      console.log("  ✓ Recovered address:", result.address, "\n");
    } else {
      console.log("  ✗ Signature verification FAILED");
      console.log("  Expected address:", testAddress);
      console.log("  Got address:", result.address, "\n");
      process.exit(1);
    }
  } catch (error) {
    console.error("  ✗ Test 1 failed:", error, "\n");
    process.exit(1);
  }

  // Test 2: Nonce can only be consumed once
  console.log("Test 2: Nonce can only be consumed once");
  try {
    // Create a fresh nonce
    const nonce = generateNonce();
    console.log("  ✓ Generated nonce:", nonce.substring(0, 16) + "...");

    // Wait a bit to ensure Redis stores it
    await new Promise((resolve) => setTimeout(resolve, 100));

    // First consumption should succeed
    const firstConsume = await consumeNonce(nonce);
    console.log("  ✓ First consumption:", firstConsume ? "success" : "failed");

    if (!firstConsume) {
      console.log("  ✗ First consumption should have succeeded\n");
      process.exit(1);
    }

    // Second consumption should fail
    const secondConsume = await consumeNonce(nonce);
    console.log(
      "  ✓ Second consumption:",
      secondConsume ? "success (BAD)" : "failed (correct)",
    );

    if (secondConsume) {
      console.log("  ✗ Second consumption should have failed\n");
      process.exit(1);
    }

    console.log("  ✓ Nonce replay protection works\n");
  } catch (error) {
    console.error("  ✗ Test 2 failed:", error, "\n");
    process.exit(1);
  }

  // Test 3: Tampered messages fail verification
  console.log("Test 3: Tampered messages fail verification");
  try {
    const nonce = generateNonce();
    const domain = getDomain();
    const message = buildMessage(
      testAddress,
      nonce,
      domain,
      FRONTEND_URL,
      CHAIN_ID,
    );

    // Sign the original message
    const signature = await signMessage({
      account: testAccount,
      message,
    });
    console.log("  ✓ Signed original message");

    // Tamper with the message (change the nonce)
    const tamperedMessage = message.replace(
      `Nonce: ${nonce}`,
      `Nonce: 0000000000000000000000000000000000000000000000000000000000000000`,
    );
    console.log("  ✓ Created tampered message (changed nonce)");

    // Verify with tampered message should fail
    const result = await verifySignature(
      tamperedMessage,
      signature as `0x${string}`,
    );
    console.log(
      "  ✓ Verification result:",
      result.valid ? "valid (BAD)" : "invalid (correct)",
    );

    if (result.valid) {
      console.log("  ✗ Tampered message should not verify\n");
      process.exit(1);
    }

    console.log("  ✓ Tamper detection works\n");
  } catch (error) {
    console.error("  ✗ Test 3 failed:", error, "\n");
    process.exit(1);
  }

  console.log("✅ All SIWE verification tests passed!\n");
  process.exit(0);
}

// Run tests
runTests().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
