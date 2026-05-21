import "@/stores/immerSetup";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = "dark" | "light" | "system";
export type Language = string;

export type UiState = {
  /** Set of currently open modal IDs */
  modals: Set<string>;
  sidebarOpen: boolean;
  theme: Theme;
  language: Language;
};

export type UiActions = {
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  toggleModal: (modalId: string) => void;
  closeAllModals: () => void;
  isModalOpen: (modalId: string) => boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
};

export type UiStore = UiState & UiActions;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useUiStore = create<UiStore>()(
  devtools(
    immer((set, get) => ({
      modals: new Set<string>(),
      sidebarOpen: false,
      theme: "dark" as Theme,
      language: "en",

      openModal: (modalId) =>
        set(
          (state) => {
            state.modals.add(modalId);
          },
          false,
          "openModal",
        ),

      closeModal: (modalId) =>
        set(
          (state) => {
            state.modals.delete(modalId);
          },
          false,
          "closeModal",
        ),

      toggleModal: (modalId) =>
        set(
          (state) => {
            if (state.modals.has(modalId)) {
              state.modals.delete(modalId);
            } else {
              state.modals.add(modalId);
            }
          },
          false,
          "toggleModal",
        ),

      closeAllModals: () =>
        set(
          (state) => {
            state.modals.clear();
          },
          false,
          "closeAllModals",
        ),

      isModalOpen: (modalId) => get().modals.has(modalId),

      setSidebarOpen: (open) =>
        set(
          (state) => {
            state.sidebarOpen = open;
          },
          false,
          "setSidebarOpen",
        ),

      toggleSidebar: () =>
        set(
          (state) => {
            state.sidebarOpen = !state.sidebarOpen;
          },
          false,
          "toggleSidebar",
        ),

      setTheme: (theme) =>
        set(
          (state) => {
            state.theme = theme;
          },
          false,
          "setTheme",
        ),

      setLanguage: (language) =>
        set(
          (state) => {
            state.language = language;
          },
          false,
          "setLanguage",
        ),
    })),
    { name: "UiStore" },
  ),
);
