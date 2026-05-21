"use client";

import { useEffect } from "react";

import { useWsContext, type WsEnvelope } from "@/providers/WsProvider";

// ─── useWs ────────────────────────────────────────────────────────────────────

/**
 * Subscribe to a WebSocket channel.
 *
 * - Registers `handler` for every message whose `channel` matches.
 * - Automatically unsubscribes when the component unmounts.
 * - React StrictMode safe: the subscribe/unsubscribe cycle on double-mount
 *   is handled correctly because `subscribe` returns a cleanup function that
 *   removes only the specific handler reference.
 * - Multiple `useWs` callers on the same channel all receive messages
 *   (fan-out implemented via a `Set<handler>` in WsProvider).
 *
 * @param channel - The WsEnvelope channel to listen on.
 * @param handler - Callback invoked with each matching WsEnvelope.
 *
 * @example
 * ```ts
 * useWs("notification", (msg) => {
 *   console.log("notification received", msg.payload);
 * });
 * ```
 */
export function useWs(
  channel: WsEnvelope["channel"],
  handler: (msg: WsEnvelope) => void,
): void {
  const { subscribe } = useWsContext();

  useEffect(() => {
    const unsubscribe = subscribe(channel, handler);
    return unsubscribe;
    // handler is intentionally excluded from deps — consumers should stabilise
    // it with useCallback. Changing channel re-subscribes correctly.
  }, [channel, subscribe]);
}
