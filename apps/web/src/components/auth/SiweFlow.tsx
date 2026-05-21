"use client";

import { useAuth } from "@/hooks/useAuth";

// ─── SiweFlow ─────────────────────────────────────────────────────────────────

/**
 * Shown after the wallet is connected.
 * Prompts the user to sign a SIWE message to authenticate.
 */
export function SiweFlow() {
  const { address, signIn, signOut, isPending, error } = useAuth();

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {/* Connected address pill */}
      <div className="text-xs text-veil-400 bg-veil-800 border border-veil-700 rounded-full px-4 py-1 font-mono truncate max-w-full">
        {address}
      </div>

      {/* Error (non-rejection only) */}
      {error ? (
        <p className="text-red-400 text-sm text-center">{error}</p>
      ) : null}

      {/* Sign button */}
      <button
        onClick={signIn}
        disabled={isPending}
        className="
          w-full px-5 py-3 rounded-lg
          bg-shard-600 hover:bg-shard-500
          border border-shard-500 hover:border-shard-400
          text-white font-semibold text-sm
          transition-all duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
        "
      >
        {isPending ? (
          <>
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Waiting for signature…
          </>
        ) : (
          "Sign in with Ethereum"
        )}
      </button>

      {/* Disconnect link */}
      <button
        onClick={signOut}
        disabled={isPending}
        className="text-xs text-veil-500 hover:text-veil-300 transition-colors underline underline-offset-2 disabled:opacity-50"
      >
        Disconnect wallet
      </button>
    </div>
  );
}
