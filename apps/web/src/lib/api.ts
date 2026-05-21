"use client";

import { useAuthStore } from "@/stores/authStore";

// ─── ApiError ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly requestId: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    requestId: string | null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

// ─── Error body shape returned by the backend ────────────────────────────────

interface ErrorBody {
  code?: string;
  message?: string;
  requestId?: string;
  error?: string;
}

// ─── api<T> ──────────────────────────────────────────────────────────────────

/**
 * Typed API fetch helper for Client Components.
 *
 * - Attaches `Authorization: Bearer <jwt>` from Zustand authStore
 *   unless `skipAuth` is `true`.
 * - Throws `ApiError` on non-2xx responses.
 * - On 401: clears authStore and redirects to `/connect`.
 */
export async function api<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const { skipAuth = false, ...fetchInit } = init ?? {};

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (
    process.env.NODE_ENV === "development" &&
    !process.env.NEXT_PUBLIC_API_URL
  ) {
    console.warn("[api] NEXT_PUBLIC_API_URL is not set — using relative URLs");
  }
  const url = `${baseUrl}${path}`;

  // Build headers — start from caller-supplied headers if any
  const headers = new Headers(fetchInit.headers);

  // Attach JWT when running in the browser and auth is not skipped
  if (!skipAuth && typeof window !== "undefined") {
    const jwt = useAuthStore.getState().jwt;
    if (jwt) {
      headers.set("Authorization", `Bearer ${jwt}`);
    }
  }

  if (!headers.has("Content-Type") && fetchInit.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...fetchInit, headers });

  if (!response.ok) {
    // Attempt to parse a structured error body from the backend
    let body: ErrorBody = {};
    try {
      body = (await response.json()) as ErrorBody;
    } catch {
      // ignore parse errors — body stays empty
    }

    const status = response.status;
    const code = body.code ?? body.error ?? String(status);
    const message = body.message ?? response.statusText;
    const requestId = body.requestId ?? response.headers.get("x-request-id");

    // 401: clear auth and redirect to /connect (browser only)
    if (status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().clearAuth();
      window.location.href = "/connect";
    }

    throw new ApiError(status, code, message, requestId);
  }

  // Parse JSON and assert to T; the caller owns the type contract
  const data = (await response.json()) as T;
  return data;
}
