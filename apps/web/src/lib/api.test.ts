import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api, ApiError } from "./api";

/**
 * Runs in the node environment, so `typeof window === "undefined"`. That is the
 * server-render path: no JWT header, and no /connect redirect on 401.
 */
function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("api()", () => {
  it("returns the parsed body on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(200, { ok: true })),
    );

    await expect(api<{ ok: boolean }>("/health")).resolves.toEqual({
      ok: true,
    });
  });

  it("prefixes the path with NEXT_PUBLIC_API_URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, {}));
    vi.stubGlobal("fetch", fetchMock);

    await api("/cards");

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/cards");
  });

  it("throws ApiError carrying status, code and message from the body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(429, {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Rate limit exceeded. Retry after 42 seconds.",
        }),
      ),
    );

    const error = await api("/auth/nonce").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(429);
    expect((error as ApiError).code).toBe("RATE_LIMIT_EXCEEDED");
    expect((error as ApiError).message).toContain("Retry after 42 seconds");
  });

  it("falls back to the status code when the error body has no code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, {})));

    const error = (await api("/cards").catch((e: unknown) => e)) as ApiError;

    expect(error.code).toBe("500");
  });

  it("survives an error response whose body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>502 Bad Gateway</html>", {
          status: 502,
          statusText: "Bad Gateway",
        }),
      ),
    );

    const error = (await api("/cards").catch((e: unknown) => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.message).toBe("Bad Gateway");
  });

  it("reads requestId from the x-request-id header when absent from the body", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(404, { code: "NOT_FOUND" }, { "x-request-id": "req-7" }),
        ),
    );

    const error = (await api("/cards/9").catch((e: unknown) => e)) as ApiError;

    expect(error.requestId).toBe("req-7");
  });
});
