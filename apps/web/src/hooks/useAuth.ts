"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";

import { api } from "@/lib/api";
import { removeToken, storeToken } from "@/lib/tokenStorage";
import { useAuthStore } from "@/stores/authStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NonceResponse {
  nonce: string;
}

interface VerifyResponse {
  jwt: string;
  expiresAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSiweMessage(
  address: string,
  chainId: number,
  nonce: string,
): string {
  return [
    `shardveil.io wants you to sign in with your Ethereum account:`,
    address,
    ``,
    `Sign in to ShardVeil`,
    ``,
    `URI: ${window.location.origin}`,
    `Version: 1`,
    `Chain ID: ${chainId}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
}

function isUserRejection(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("rejected") || msg.includes("denied");
  }
  return false;
}

// ─── useAuth ──────────────────────────────────────────────────────────────────

export function useAuth() {
  const router = useRouter();
  const { address, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const { isAuthenticated, setAuth, clearAuth } = useAuthStore();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    if (!address || !chainId) return;

    setIsPending(true);
    setError(null);

    try {
      // 1. Fetch nonce from backend
      const { nonce } = await api<NonceResponse>("/auth/nonce", {
        skipAuth: true,
      });

      // 2. Build EIP-4361 message
      const message = buildSiweMessage(address, chainId, nonce);

      // 3. Sign with wallet
      let signature: string;
      try {
        signature = await signMessageAsync({ message });
      } catch (signErr) {
        // Silently ignore user rejection
        if (isUserRejection(signErr)) {
          return;
        }
        throw signErr;
      }

      // 4. Verify with backend
      const { jwt, expiresAt } = await api<VerifyResponse>("/auth/verify", {
        method: "POST",
        skipAuth: true,
        body: JSON.stringify({ message, signature }),
      });

      // 5. Persist: Zustand store + httpOnly cookie
      setAuth(address, jwt, expiresAt);
      await storeToken(jwt, expiresAt);

      // 6. Navigate to dashboard
      router.push("/dashboard");
    } catch (err) {
      if (!isUserRejection(err)) {
        setError(err instanceof Error ? err.message : "Sign-in failed");
      }
    } finally {
      setIsPending(false);
    }
  }, [address, chainId, signMessageAsync, setAuth, router]);

  const signOut = useCallback(async () => {
    try {
      await api<unknown>("/auth/logout", { method: "POST" });
    } catch {
      // ignore logout errors — clear local state regardless
    }

    clearAuth();
    await removeToken().catch(() => undefined);
    disconnect();
  }, [clearAuth, disconnect]);

  return {
    isAuthenticated,
    address: address as string | undefined,
    signIn,
    signOut,
    isPending,
    error,
  };
}
