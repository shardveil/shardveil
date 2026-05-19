"use client";

import { useConnect } from "wagmi";

// ─── ConnectWalletButton ──────────────────────────────────────────────────────

const CONNECTOR_LABELS: Record<string, string> = {
  injected: "MetaMask",
  walletConnect: "WalletConnect",
  coinbaseWalletSDK: "Coinbase Wallet",
};

function connectorLabel(id: string, name: string): string {
  return CONNECTOR_LABELS[id] ?? name;
}

export function ConnectWalletButton() {
  const { connect, connectors, isPending, variables } = useConnect();

  return (
    <div className="flex flex-col gap-3 w-full">
      {connectors.map((connector) => {
        const isThisPending = isPending && variables?.connector === connector;
        const label = connectorLabel(connector.id, connector.name);

        return (
          <button
            key={connector.uid}
            onClick={() => connect({ connector })}
            disabled={isPending}
            className="
              flex items-center justify-center gap-3
              w-full px-5 py-3 rounded-lg
              bg-veil-800 hover:bg-veil-700
              border border-veil-700 hover:border-veil-500
              text-white font-medium text-sm
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isThisPending ? (
              <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : null}
            {isThisPending ? "Connecting…" : label}
          </button>
        );
      })}
    </div>
  );
}
