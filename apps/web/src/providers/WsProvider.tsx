// Note: WsProvider will be composed into AppProvider in Task 5.13.
// Mount it inside the auth-aware tree so isAuthenticated is available.
"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useNotificationStore } from "@/stores/notificationStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WsChannel = "battle" | "chat" | "notification" | "presence";

export type WsEnvelope = {
  channel: WsChannel;
  type: string;
  payload: unknown;
};

export type WsMessageHandler = (msg: WsEnvelope) => void;

export type WsContextType = {
  send: (
    channel: WsEnvelope["channel"],
    type: string,
    payload: unknown,
  ) => void;
  isConnected: boolean;
  subscribe: (
    channel: WsEnvelope["channel"],
    handler: WsMessageHandler,
  ) => () => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";

const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 10;

const DEFAULT_SUBSCRIBE_CHANNELS: WsEnvelope["channel"][] = [
  "notification",
  "presence",
];

// ─── Context ──────────────────────────────────────────────────────────────────

const WsContext = createContext<WsContextType | null>(null);

export function useWsContext(): WsContextType {
  const ctx = useContext(WsContext);
  if (!ctx) {
    throw new Error("useWsContext must be used within <WsProvider>");
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface WsProviderProps {
  children: ReactNode;
}

/**
 * WsProvider maintains a single persistent WebSocket connection per session.
 *
 * - Connects when the user is authenticated (jwt available in store).
 * - Sends subscribe messages for `notification` and `presence` on open.
 * - Auto-reconnects with exponential backoff (1s → 2s → 4s … max 30s, max 10 attempts).
 * - Replies to server PING frames with PONG.
 * - Dispatches messages to per-channel subscribers registered via `subscribe`.
 * - Centralised store integration: notification → notificationStore, chat → chatStore.
 * - Disconnects cleanly when the user logs out.
 */
export function WsProvider({ children }: WsProviderProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const jwt = useAuthStore((s) => s.jwt);

  const [isConnected, setIsConnected] = useState(false);

  // Mutable refs to avoid stale-closure issues in WebSocket callbacks
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  // destroyed flag prevents reconnect after intentional close
  const destroyedRef = useRef(false);

  // listeners: Map<channel, Set<handler>>
  const listenersRef = useRef<
    Map<WsEnvelope["channel"], Set<WsMessageHandler>>
  >(new Map());

  // ── Store action refs (stable across renders) ───────────────────────────────
  const addNotification = useNotificationStore((s) => s.addNotification);
  const incrementUnread = useChatStore((s) => s.incrementUnread);

  const addNotificationRef = useRef(addNotification);
  addNotificationRef.current = addNotification;

  const incrementUnreadRef = useRef(incrementUnread);
  incrementUnreadRef.current = incrementUnread;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const sendRaw = useCallback((data: unknown) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }, []);

  // ── Dispatch incoming message to channel listeners ──────────────────────────

  const dispatch = useCallback((envelope: WsEnvelope) => {
    // Centralised store integration
    if (envelope.channel === "notification") {
      const p = envelope.payload as {
        id?: string;
        type?: string;
        message?: string;
      };
      if (p?.id && p?.message) {
        addNotificationRef.current({
          id: p.id,
          type: (p.type as "info" | "success" | "warning" | "error") ?? "info",
          message: p.message,
        });
      }
    } else if (envelope.channel === "chat" && envelope.type === "MESSAGE") {
      const p = envelope.payload as { roomId?: string };
      if (p?.roomId) {
        incrementUnreadRef.current(p.roomId);
      }
    }

    // Fan-out to subscribed handlers
    const handlers = listenersRef.current.get(envelope.channel);
    if (handlers) {
      for (const handler of handlers) {
        handler(envelope);
      }
    }
  }, []);

  // ── connect ─────────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (!jwt || !WS_URL) return;
    if (destroyedRef.current) return;

    const url = `${WS_URL}/ws?token=${jwt}`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      if (destroyedRef.current) {
        ws.close();
        return;
      }
      attemptRef.current = 0;
      setIsConnected(true);

      // Subscribe to default channels on open
      for (const channel of DEFAULT_SUBSCRIBE_CHANNELS) {
        sendRaw({ channel, type: "SUBSCRIBE", payload: {} });
      }
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let envelope: unknown;
      try {
        envelope = JSON.parse(event.data);
      } catch {
        return;
      }

      if (
        typeof envelope !== "object" ||
        envelope === null ||
        !("type" in envelope)
      ) {
        return;
      }

      const env = envelope as Record<string, unknown>;

      // Server heartbeat
      if (env["type"] === "PING" && !("channel" in env)) {
        sendRaw({ type: "PONG" });
        return;
      }

      // Must be a full WsEnvelope to dispatch
      if (
        typeof env["channel"] === "string" &&
        typeof env["type"] === "string"
      ) {
        dispatch(env as unknown as WsEnvelope);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      socketRef.current = null;

      if (destroyedRef.current) return;

      const attempt = attemptRef.current;
      if (attempt >= MAX_RECONNECT_ATTEMPTS) {
        // Give up after max attempts
        return;
      }

      const backoff = Math.min(
        BACKOFF_BASE_MS * Math.pow(2, attempt),
        BACKOFF_MAX_MS,
      );
      attemptRef.current = attempt + 1;

      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, backoff);
    };

    ws.onerror = () => {
      // onclose will fire after onerror; reconnect handled there
    };
  }, [jwt, sendRaw, dispatch]);

  // ── Effect: open/close based on auth state ───────────────────────────────────

  useEffect(() => {
    if (isAuthenticated && jwt) {
      destroyedRef.current = false;
      attemptRef.current = 0;
      connect();
    } else {
      // User logged out or not authenticated — tear down
      destroyedRef.current = true;
      clearReconnectTimer();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
    }

    return () => {
      destroyedRef.current = true;
      clearReconnectTimer();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, jwt, connect, clearReconnectTimer]);

  // ── Context API ──────────────────────────────────────────────────────────────

  const send = useCallback(
    (channel: WsEnvelope["channel"], type: string, payload: unknown) => {
      sendRaw({ channel, type, payload });
    },
    [sendRaw],
  );

  const subscribe = useCallback(
    (
      channel: WsEnvelope["channel"],
      handler: WsMessageHandler,
    ): (() => void) => {
      const map = listenersRef.current;
      if (!map.has(channel)) {
        map.set(channel, new Set());
      }
      map.get(channel)!.add(handler);

      return () => {
        map.get(channel)?.delete(handler);
      };
    },
    [],
  );

  const contextValue: WsContextType = {
    send,
    isConnected,
    subscribe,
  };

  return (
    <WsContext.Provider value={contextValue}>{children}</WsContext.Provider>
  );
}
