"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/stores/authStore";

// ─── AuthGate ─────────────────────────────────────────────────────────────────

interface AuthGateProps {
  children: React.ReactNode;
}

interface SessionResponse {
  authenticated: boolean;
  token?: string;
  address?: string;
  expiresAt?: number;
}

/**
 * Wrap protected pages with this component.
 *
 * On mount: rehydrates Zustand from localStorage and restores the JWT from
 * the httpOnly cookie via /api/auth/session before deciding to redirect.
 * This prevents the flash-redirect to /connect on page refresh.
 */
export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    async function restoreSession() {
      // Rehydrate Zustand from localStorage (skipHydration: true requires manual trigger)
      useAuthStore.persist.rehydrate();

      try {
        const res = await fetch("/api/auth/session");
        const data = (await res.json()) as SessionResponse;

        if (
          data.authenticated &&
          data.token &&
          data.address &&
          data.expiresAt
        ) {
          // Restore JWT into in-memory Zustand state (not persisted)
          setAuth(data.address, data.token, data.expiresAt);
        } else {
          // Cookie missing or expired — clear any stale localStorage auth state
          clearAuth();
        }
      } catch {
        // Network error — keep whatever localStorage state was rehydrated
      }

      setHasHydrated(true);
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/connect?redirect=${redirect}`);
    }
  }, [hasHydrated, isAuthenticated, pathname, router]);

  // Wait for session restoration before making any auth decision
  if (!hasHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* NetworkBanner placeholder — Task 5.15 will fill this in */}
      <div data-network-banner-placeholder hidden />
      {children}
    </>
  );
}
