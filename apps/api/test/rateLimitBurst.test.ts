/**
 * Rate limiter rollback.
 *
 * A denied request removes the entry it optimistically added. That removal
 * used to be a score range [now, now] rather than the member itself, so a
 * burst arriving inside one millisecond wiped its own bucket on the first
 * rejection and the following request was let straight back in.
 */

import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";

import { errorHandler } from "../src/middleware/errorHandler";
import { rateLimit } from "../src/middleware/rateLimit";

const MAX = 2;
const IP = "198.51.100.7";

const app = new Hono();
app.onError(errorHandler);
app.get(
  "/limited",
  rateLimit({
    windowMs: 60_000,
    max: MAX,
    keyBy: "ip",
    name: `burst:${Date.now()}`, // fresh bucket per run
  }),
  (c) => c.json({ ok: true }),
);

afterEach(() => {
  vi.useRealTimers();
});

describe("rate limit burst rollback", () => {
  it("keeps rejecting once over the limit, even within one millisecond", async () => {
    // Freeze the clock so every request lands on the same sorted-set score —
    // the exact case the score-range removal got wrong.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const send = () =>
      app.request("/limited", { headers: { "x-forwarded-for": IP } });

    const statuses: number[] = [];
    for (let i = 0; i < MAX + 3; i++) {
      statuses.push((await send()).status);
    }

    expect(statuses.slice(0, MAX)).toEqual(Array(MAX).fill(200));
    expect(statuses.slice(MAX)).toEqual([429, 429, 429]);
  });
});
