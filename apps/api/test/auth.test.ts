import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { describe, expect, it } from "vitest";

import { app } from "../src/app";
import { buildMessage } from "../src/lib/siwe";

// Hardhat/Anvil dev key #0 — universally known, zero value, safe to use in tests
const TEST_PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const testAccount = privateKeyToAccount(TEST_PRIVATE_KEY);

const TEST_DOMAIN = "localhost:3000";
const TEST_URI = "http://localhost:3000";

/**
 * Fetch a fresh nonce from the API.
 */
async function fetchNonce(): Promise<{ nonce: string; expiresAt: string }> {
  const res = await app.request("/auth/nonce");
  return res.json() as Promise<{ nonce: string; expiresAt: string }>;
}

/**
 * Build a signed SIWE message for the test account.
 */
async function buildSignedMessage(nonce: string) {
  const message = buildMessage(
    testAccount.address,
    nonce,
    TEST_DOMAIN,
    TEST_URI,
    arbitrumSepolia.id,
  );
  const signature = await testAccount.signMessage({ message });
  return { message, signature };
}

describe("Auth routes", () => {
  it("GET /auth/nonce returns nonce and expiresAt", async () => {
    const res = await app.request("/auth/nonce");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { nonce: string; expiresAt: string };
    expect(typeof body.nonce).toBe("string");
    expect(body.nonce.length).toBeGreaterThan(0);
    expect(typeof body.expiresAt).toBe("string");
    expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("POST /auth/verify — full SIWE round-trip returns token and player", async () => {
    const { nonce } = await fetchNonce();
    const { message, signature } = await buildSignedMessage(nonce);

    const res = await app.request("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });

    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      token: string;
      expiresAt: string;
      player: { address: string; username: string | null };
    };
    expect(typeof body.token).toBe("string");
    expect(body.token.split(".").length).toBe(3); // valid JWT
    expect(body.player.address.toLowerCase()).toBe(
      testAccount.address.toLowerCase(),
    );
    expect(typeof body.expiresAt).toBe("string");
  });

  it("POST /auth/verify — replay attack blocked (same nonce used twice)", async () => {
    const { nonce } = await fetchNonce();
    const { message, signature } = await buildSignedMessage(nonce);

    // First request succeeds
    const res1 = await app.request("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    expect(res1.status).toBe(200);

    // Second request with same message+signature must fail
    const res2 = await app.request("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    expect(res2.status).toBe(401);
  });

  it("POST /auth/verify — expired/unknown nonce fails with 401", async () => {
    const fakeNonce =
      "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";
    const message = buildMessage(
      testAccount.address,
      fakeNonce,
      TEST_DOMAIN,
      TEST_URI,
      arbitrumSepolia.id,
    );
    const signature = await testAccount.signMessage({ message });

    const res = await app.request("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });

    expect(res.status).toBe(401);
  });

  it("POST /auth/verify — invalid body returns 400", async () => {
    const res = await app.request("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "", signature: "not-a-signature" }),
    });

    expect(res.status).toBe(400);
  });

  it("POST /auth/logout — returns success", async () => {
    const res = await app.request("/auth/logout", {
      method: "POST",
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("POST /auth/logout — clears presence even with valid token", async () => {
    const { nonce } = await fetchNonce();
    const { message, signature } = await buildSignedMessage(nonce);

    const verifyRes = await app.request("/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    });
    const { token } = (await verifyRes.json()) as { token: string };

    const logoutRes = await app.request("/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(logoutRes.status).toBe(200);
    const body = (await logoutRes.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });
});
