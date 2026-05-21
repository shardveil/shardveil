import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType = "info" | "success" | "warning" | "error";

export type Notification = {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: number;
};

export type NotificationState = {
  unreadCount: number;
  items: Notification[];
  isOpen: boolean;
};

export type NotificationActions = {
  addNotification: (
    notification: Omit<Notification, "read" | "createdAt">,
  ) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeNotification: (id: string) => void;
  setOpen: (open: boolean) => void;
};

export type NotificationStore = NotificationState & NotificationActions;

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ITEMS = 50;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStore>()(
  devtools(
    immer((set) => ({
      unreadCount: 0,
      items: [],
      isOpen: false,

      addNotification: (notification) =>
        set(
          (state) => {
            const newItem: Notification = {
              ...notification,
              read: false,
              createdAt: Date.now(),
            };
            // Prepend and cap at MAX_ITEMS (oldest items at the tail are dropped)
            state.items = [newItem, ...state.items].slice(0, MAX_ITEMS);
            state.unreadCount = state.items.filter((n) => !n.read).length;
          },
          false,
          "addNotification",
        ),

      markRead: (id) =>
        set(
          (state) => {
            const item = state.items.find((n) => n.id === id);
            if (item && !item.read) {
              item.read = true;
            }
            state.unreadCount = state.items.filter((n) => !n.read).length;
          },
          false,
          "markRead",
        ),

      markAllRead: () =>
        set(
          (state) => {
            state.items.forEach((n) => {
              n.read = true;
            });
            state.unreadCount = 0;
          },
          false,
          "markAllRead",
        ),

      removeNotification: (id) =>
        set(
          (state) => {
            state.items = state.items.filter((n) => n.id !== id);
            state.unreadCount = state.items.filter((n) => !n.read).length;
          },
          false,
          "removeNotification",
        ),

      setOpen: (open) =>
        set(
          (state) => {
            state.isOpen = open;
          },
          false,
          "setOpen",
        ),
    })),
    { name: "NotificationStore" },
  ),
);
