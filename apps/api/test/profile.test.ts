import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { app } from "../src/app";
import { createPlayer } from "./helpers/factories";

const JWT_SECRET = "test-secret-min-32-chars-long-xxxxxxxx";

/**
 * Sign a test JWT for the given address using the test secret.
 */
async function signTestJwt(address: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ sub: address, jti: crypto.randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .setIssuedAt()
    .sign(secret);
}

describe("Profile routes", () => {
  describe("GET /profile/me", () => {
    it("returns own profile when authenticated", async () => {
      const player = await createPlayer({ bio: "Hello world" });
      const token = await signTestJwt(player.address);

      const res = await app.request("/profile/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        address: string;
        bio: string | null;
      };
      expect(body.address.toLowerCase()).toBe(player.address.toLowerCase());
      expect(body.bio).toBe("Hello world");
    });

    it("returns 401 when not authenticated", async () => {
      const res = await app.request("/profile/me");
      expect(res.status).toBe(401);
    });

    it("returns 404 when player does not exist", async () => {
      // Use a valid address that was never upserted
      const token = await signTestJwt(
        "0x0000000000000000000000000000000000000001",
      );

      const res = await app.request("/profile/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /profile/:address", () => {
    it("returns public profile for existing player", async () => {
      const player = await createPlayer({ bio: "Public bio" });

      const res = await app.request(`/profile/${player.address}`);

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        address: string;
        bio: string | null;
      };
      expect(body.address.toLowerCase()).toBe(player.address.toLowerCase());
      expect(body.bio).toBe("Public bio");
    });

    it("returns 404 for non-existent address", async () => {
      const res = await app.request(
        "/profile/0x0000000000000000000000000000000000000099",
      );
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid address format", async () => {
      const res = await app.request("/profile/not-an-address");
      expect(res.status).toBe(400);
    });

    it("hides sensitive fields for private profile when requester is unauthenticated", async () => {
      const player = await createPlayer({
        bio: "Secret bio",
        twitterHandle: "secret_twitter",
        discordHandle: "secret_discord",
        isPrivate: true,
      });

      const res = await app.request(`/profile/${player.address}`);

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        bio: string | null;
        twitterHandle: string | null;
        discordHandle: string | null;
        isPrivate: boolean;
      };
      expect(body.bio).toBeNull();
      expect(body.twitterHandle).toBeNull();
      expect(body.discordHandle).toBeNull();
      expect(body.isPrivate).toBe(true);
    });

    it("hides sensitive fields for private profile when requester is different user", async () => {
      const owner = await createPlayer({
        bio: "Owner bio",
        isPrivate: true,
      });
      const requester = await createPlayer();
      const token = await signTestJwt(requester.address);

      const res = await app.request(`/profile/${owner.address}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { bio: string | null };
      expect(body.bio).toBeNull();
    });

    it("shows full private profile to the owner themselves", async () => {
      const player = await createPlayer({
        bio: "My secret bio",
        isPrivate: true,
      });
      const token = await signTestJwt(player.address);

      const res = await app.request(`/profile/${player.address}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { bio: string | null };
      expect(body.bio).toBe("My secret bio");
    });
  });

  describe("PATCH /profile/me", () => {
    it("updates bio successfully", async () => {
      const player = await createPlayer();
      const token = await signTestJwt(player.address);

      const res = await app.request("/profile/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: "Updated bio" }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { bio: string | null };
      expect(body.bio).toBe("Updated bio");
    });

    it("updates privacy flag", async () => {
      const player = await createPlayer({ isPrivate: false });
      const token = await signTestJwt(player.address);

      const res = await app.request("/profile/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPrivate: true }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as { isPrivate: boolean };
      expect(body.isPrivate).toBe(true);
    });

    it("updates twitterHandle and discordHandle", async () => {
      const player = await createPlayer();
      const token = await signTestJwt(player.address);

      const res = await app.request("/profile/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          twitterHandle: "mytwitter",
          discordHandle: "mydiscord",
        }),
      });

      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        twitterHandle: string | null;
        discordHandle: string | null;
      };
      expect(body.twitterHandle).toBe("mytwitter");
      expect(body.discordHandle).toBe("mydiscord");
    });

    it("returns 401 when not authenticated", async () => {
      const res = await app.request("/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: "Unauthorized" }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid body (bio too long)", async () => {
      const player = await createPlayer();
      const token = await signTestJwt(player.address);

      const res = await app.request("/profile/me", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio: "x".repeat(161) }), // exceeds 160 char limit
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /profile/check-username/:name", () => {
    it("returns available: true for unused username", async () => {
      const res = await app.request("/profile/check-username/ShardVeil");

      expect(res.status).toBe(200);
      const body = (await res.json()) as { available: boolean };
      expect(body.available).toBe(true);
    });

    it("returns available: false for taken username", async () => {
      await createPlayer({ username: "TakenName" });

      const res = await app.request("/profile/check-username/TakenName");

      expect(res.status).toBe(200);
      const body = (await res.json()) as { available: boolean };
      expect(body.available).toBe(false);
    });

    it("returns 400 for invalid username format", async () => {
      const res = await app.request("/profile/check-username/ab"); // too short
      expect(res.status).toBe(400);
    });
  });
});
