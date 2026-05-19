"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/authStore";

// ─── AuthGate ─────────────────────────────────────────────────────────────────

interface AuthGateProps {
  children: React.ReactNode;
}

/**
 * Wrap protected pages with this component.
 *
 * - If not authenticated → redirects to `/connect?redirect=<originalPath>`
 * - If on the wrong network → renders a NetworkBanner placeholder
 *   (full implementation in Task 5.15)
 */
export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/connect?redirect=${redirect}`);
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) {
    // Render nothing while the redirect is in-flight
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
