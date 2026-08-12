import { describe, expect, it } from "vitest";

import { app } from "../src/app";

describe("Global rate limit", () => {
  it("GET /health is exempt — 70 rapid polls all stay under the limit", async () => {
    const headers = { "x-forwarded-for": "203.0.113.40" };

    // 70 > the global 60/min budget; an uptime monitor must never see a 429.
    for (let i = 0; i < 70; i++) {
      const res = await app.request("/health", { headers });
      expect(res.status).not.toBe(429);
    }
  });
});

describe("Leaderboard routes", () => {
  it("GET /leaderboard/guilds — 31st request in a window is rate limited", async () => {
    const ip = "203.0.113.30";
    const send = () =>
      app.request("/leaderboard/guilds", {
        headers: { "x-forwarded-for": ip },
      });

    for (let i = 0; i < 30; i++) {
      expect((await send()).status).not.toBe(429);
    }

    const blocked = await send();
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("Retry-After"))).toBeGreaterThan(0);
  });

  it("the heavy-read limit is shared across leaderboard routes, not per-route", async () => {
    const ip = "203.0.113.31";
    const headers = { "x-forwarded-for": ip };

    for (let i = 0; i < 30; i++) {
      await app.request("/leaderboard/guilds", { headers });
    }

    // A different route on the same router draws from the same bucket.
    const other = await app.request("/leaderboard/crafters", { headers });
    expect(other.status).toBe(429);
  });
});
