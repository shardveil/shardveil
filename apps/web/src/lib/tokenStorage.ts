import { useAuthStore } from "@/stores/authStore";

// ─── tokenStorage ────────────────────────────────────────────────────────────
//
// Manages the httpOnly JWT cookie through Next.js Route Handlers.
//
// The httpOnly cookie itself is written/deleted server-side by the Route
// Handlers at `/api/auth/cookie` (implemented in Task 5.7).  JS cannot read
// httpOnly cookies — callers should use `getToken()` which reads the
// in-memory Zustand authStore instead.
//
// ─────────────────────────────────────────────────────────────────────────────

interface StoreTokenPayload {
  jwt: string;
  expiresAt: number;
}

/**
 * Persist the JWT as an httpOnly cookie by calling our own Route Handler.
 * Also stores it in the Zustand authStore (done by the caller separately, or
 * by the SIWE flow in Task 5.7) — this function only handles the cookie side.
 *
 * @param jwt       - The JWT string to store.
 * @param expiresAt - Unix timestamp (ms) at which the token expires.
 */
export async function storeToken(
  jwt: string,
  expiresAt: number,
): Promise<void> {
  const payload: StoreTokenPayload = { jwt, expiresAt };

  const response = await fetch("/api/auth/cookie", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to store token: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Remove the httpOnly JWT cookie by calling our own Route Handler.
 * The authStore is cleared separately by the caller (or by the SIWE sign-out
 * flow in Task 5.7).
 */
export async function removeToken(): Promise<void> {
  const response = await fetch("/api/auth/cookie", {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to remove token: ${response.status} ${response.statusText}`,
    );
  }
}

/**
 * Return the current JWT from the Zustand authStore (in-memory).
 *
 * httpOnly cookies cannot be read by JavaScript — this function reads the
 * in-memory store that was populated during the auth flow.  Returns `null`
 * when the user is not authenticated.
 */
export function getToken(): string | null {
  return useAuthStore.getState().jwt;
}
