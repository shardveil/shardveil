import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatState = {
  /** Set of room IDs the local user has joined */
  activeRooms: Set<string>;
  /** Per-room unread message counts */
  unreadByRoom: Map<string, number>;
  /** Saved message drafts per room */
  drafts: Map<string, string>;
};

export type ChatActions = {
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  incrementUnread: (roomId: string, count?: number) => void;
  clearUnread: (roomId: string) => void;
  setDraft: (roomId: string, text: string) => void;
  clearDraft: (roomId: string) => void;
};

export type ChatStore = ChatState & ChatActions;

// ─── Store ────────────────────────────────────────────────────────────────────

// chatStore is ephemeral (no persist) — Set/Map are not JSON-serialisable
export const useChatStore = create<ChatStore>()(
  devtools(
    immer((set) => ({
      activeRooms: new Set<string>(),
      unreadByRoom: new Map<string, number>(),
      drafts: new Map<string, string>(),

      joinRoom: (roomId) =>
        set(
          (state) => {
            state.activeRooms.add(roomId);
          },
          false,
          "joinRoom",
        ),

      leaveRoom: (roomId) =>
        set(
          (state) => {
            state.activeRooms.delete(roomId);
            state.unreadByRoom.delete(roomId);
            state.drafts.delete(roomId);
          },
          false,
          "leaveRoom",
        ),

      incrementUnread: (roomId, count = 1) =>
        set(
          (state) => {
            const prev = state.unreadByRoom.get(roomId) ?? 0;
            state.unreadByRoom.set(roomId, prev + count);
          },
          false,
          "incrementUnread",
        ),

      clearUnread: (roomId) =>
        set(
          (state) => {
            state.unreadByRoom.delete(roomId);
          },
          false,
          "clearUnread",
        ),

      setDraft: (roomId, text) =>
        set(
          (state) => {
            state.drafts.set(roomId, text);
          },
          false,
          "setDraft",
        ),

      clearDraft: (roomId) =>
        set(
          (state) => {
            state.drafts.delete(roomId);
          },
          false,
          "clearDraft",
        ),
    })),
    { name: "ChatStore" },
  ),
);
