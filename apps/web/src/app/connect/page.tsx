"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAccount } from "wagmi";

import { ConnectWalletButton } from "@/components/auth/ConnectWalletButton";
import { SiweFlow } from "@/components/auth/SiweFlow";
import { useAuthStore } from "@/stores/authStore";

// ─── ConnectPage ──────────────────────────────────────────────────────────────

export default function ConnectPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Already authenticated → go straight to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) return null;

  return (
    <main className="min-h-screen bg-veil-950 flex items-center justify-center px-4">
      <div
        className="
          w-full max-w-sm
          bg-veil-900 border border-veil-700
          rounded-2xl p-8
          flex flex-col items-center gap-6
          shadow-xl
        "
      >
        {/* Logo / heading */}
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wide text-white">
            ShardVeil
          </h1>
          <p className="text-veil-400 text-sm">
            {isConnected
              ? "Sign the message to prove wallet ownership"
              : "Connect your wallet to continue"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 w-full justify-center text-xs text-veil-500">
          <StepDot
            active={!isConnected}
            done={isConnected}
            label="1. Connect"
          />
          <span className="w-6 border-t border-veil-700" />
          <StepDot active={isConnected} done={false} label="2. Sign" />
          <span className="w-6 border-t border-veil-700" />
          <StepDot active={false} done={false} label="3. Play" />
        </div>

        {/* Main action area */}
        {isConnected ? <SiweFlow /> : <ConnectWalletButton />}

        {/* Footer note */}
        <p className="text-veil-600 text-xs text-center leading-relaxed">
          Signing is free and does not initiate a transaction.
        </p>
      </div>
    </main>
  );
}

// ─── StepDot ──────────────────────────────────────────────────────────────────

function StepDot({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <span
      className={[
        "flex items-center gap-1 transition-colors",
        done
          ? "text-shard-400"
          : active
            ? "text-white font-semibold"
            : "text-veil-600",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block w-2 h-2 rounded-full",
          done ? "bg-shard-400" : active ? "bg-white" : "bg-veil-700",
        ].join(" ")}
      />
      {label}
    </span>
  );
}
