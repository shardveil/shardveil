import { afterEach, describe, expect, it, vi } from "vitest";

async function loadSentryConfig(dsn: string | undefined) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", dsn ?? "");
  return import("./sentry");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isSentryEnabled", () => {
  it("is false when the DSN is unset", async () => {
    const { isSentryEnabled } = await loadSentryConfig(undefined);

    expect(isSentryEnabled).toBe(false);
  });

  it("is false for the .env.example placeholder", async () => {
    // Copying .env.example to .env.local is the normal first step, so the
    // placeholder must not be mistaken for a configured DSN.
    const { isSentryEnabled } = await loadSentryConfig("your_sentry_dsn_here");

    expect(isSentryEnabled).toBe(false);
  });

  it("is true for a real DSN", async () => {
    const { isSentryEnabled } = await loadSentryConfig(
      "https://abc123@o1.ingest.sentry.io/42",
    );

    expect(isSentryEnabled).toBe(true);
  });
});
