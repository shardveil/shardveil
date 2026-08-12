/**
 * Activity feed routes.
 *
 * activityService.getFeed / like / unlike had no HTTP surface at all — the
 * indexer and the activity worker wrote activities and pushed them over WS,
 * but nothing could read the feed back or like anything. These cover the
 * routes that close that gap, including the like state the feed renders.
 */

import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";

import { app } from "../src/app";
import { prisma } from "../src/config/database";
import { createPlayer } from "./helpers/factories";

const JWT_SECRET = "test-secret-min-32-chars-long-xxxxxxxx";

async function signTestJwt(address: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({ sub: address, jti: crypto.randomUUID() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .setIssuedAt()
    .sign(secret);
}

/** A viewer, a friend of theirs, and one activity by that friend. */
async function seedFeed() {
  const viewer = await createPlayer();
  const friend = await createPlayer();

  await prisma.friend.create({
    data: { playerId: viewer.address, friendId: friend.address },
  });

  const activity = await prisma.activity.create({
    data: {
      actorAddress: friend.address,
      type: "BATTLE_WON",
      data: { matchId: "match-1" },
    },
  });

  return { viewer, friend, activity, token: await signTestJwt(viewer.address) };
}

describe("Activity feed routes", () => {
  it("GET /activity/feed returns a friend's activity with zeroed like state", async () => {
    const { activity, token } = await seedFeed();

    const res = await app.request("/activity/feed", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.activities).toHaveLength(1);
    expect(body.activities[0]).toMatchObject({
      id: activity.id,
      type: "BATTLE_WON",
      likeCount: 0,
      hasLiked: false,
    });
  });

  it("liking an activity shows up as likeCount and hasLiked on the next read", async () => {
    const { activity, token } = await seedFeed();

    const liked = await app.request(`/activity/${activity.id}/like`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(liked.status).toBe(200);

    const res = await app.request("/activity/feed", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    expect(body.activities[0]).toMatchObject({ likeCount: 1, hasLiked: true });
  });

  it("unliking removes it again", async () => {
    const { activity, token } = await seedFeed();
    const auth = { Authorization: `Bearer ${token}` };

    await app.request(`/activity/${activity.id}/like`, {
      method: "POST",
      headers: auth,
    });
    const unliked = await app.request(`/activity/${activity.id}/like`, {
      method: "DELETE",
      headers: auth,
    });
    expect(unliked.status).toBe(200);

    const res = await app.request("/activity/feed", { headers: auth });
    const body = await res.json();
    expect(body.activities[0]).toMatchObject({ likeCount: 0, hasLiked: false });
  });

  it("liking is idempotent — the set counts an address once", async () => {
    const { activity, token } = await seedFeed();
    const auth = { Authorization: `Bearer ${token}` };

    await app.request(`/activity/${activity.id}/like`, {
      method: "POST",
      headers: auth,
    });
    await app.request(`/activity/${activity.id}/like`, {
      method: "POST",
      headers: auth,
    });

    const res = await app.request("/activity/feed", { headers: auth });
    const body = await res.json();
    expect(body.activities[0].likeCount).toBe(1);
  });

  it("404s on an unknown activity instead of creating a stray like set", async () => {
    const { token } = await seedFeed();

    const res = await app.request("/activity/does-not-exist/like", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(404);
  });

  it("requires authentication", async () => {
    const res = await app.request("/activity/feed");
    expect(res.status).toBe(401);
  });

  it("returns an empty feed for a player with no friends", async () => {
    const loner = await createPlayer();
    const token = await signTestJwt(loner.address);

    const res = await app.request("/activity/feed", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    expect((await res.json()).activities).toEqual([]);
  });

  it("rejects an out-of-range pageSize", async () => {
    const { token } = await seedFeed();

    const res = await app.request("/activity/feed?pageSize=500", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(400);
  });
});
