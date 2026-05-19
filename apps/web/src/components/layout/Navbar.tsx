"use client";

import { Bell, ChevronDown, LogOut, MessageSquare, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAuthStore } from "@/stores/authStore";
import { useNotificationStore } from "@/stores/notificationStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

export function Navbar() {
  const address = useAuthStore((s) => s.address);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const [walletOpen, setWalletOpen] = useState(false);

  return (
    <>
      {/* ── Desktop navbar ── */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-surface-elevated/90 backdrop-blur-md border-b border-stroke-base hidden md:flex items-center px-4 gap-4">
        {/* Left — Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 shrink-0 select-none"
        >
          <span className="font-display text-xl text-veil-400">&#x2728;</span>
          <span className="font-display text-lg text-content-primary tracking-wide">
            ShardVeil
          </span>
        </Link>

        {/* Center — Search trigger */}
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            aria-label="Open search"
            className="flex items-center gap-2 bg-surface-overlay rounded-lg px-4 py-2 text-content-muted text-sm w-full max-w-sm hover:bg-surface-overlay/80 transition-colors"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border border-stroke-base px-1.5 text-[10px] text-content-muted">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Notifications */}
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-content-secondary hover:text-content-primary hover:bg-surface-overlay transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-veil-500 text-white text-[10px] flex items-center justify-center font-body font-medium">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* DM */}
          <button
            type="button"
            aria-label="Messages"
            className="rounded-lg p-2 text-content-secondary hover:text-content-primary hover:bg-surface-overlay transition-colors"
          >
            <MessageSquare className="h-5 w-5" />
          </button>

          {/* Wallet avatar dropdown */}
          <div className="relative">
            <button
              type="button"
              aria-label="Wallet menu"
              aria-expanded={walletOpen}
              onClick={() => setWalletOpen((prev) => !prev)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-content-secondary hover:text-content-primary hover:bg-surface-overlay transition-colors"
            >
              <div className="h-6 w-6 rounded-full bg-veil-700 flex items-center justify-center text-veil-300 text-xs font-body font-semibold shrink-0">
                {address ? address.slice(2, 4).toUpperCase() : "?"}
              </div>
              <span className="hidden lg:block font-body text-xs">
                {address ? formatAddress(address) : "Not connected"}
              </span>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${walletOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown */}
            {walletOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-stroke-base bg-surface-elevated shadow-lg py-1 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setWalletOpen(false);
                    clearAuth();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-content-secondary hover:text-blood-400 hover:bg-surface-overlay transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Spacer so content doesn't hide behind fixed navbar */}
      <div className="hidden md:block h-16 shrink-0" />

      {/* ── Mobile bottom bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-surface-elevated/95 backdrop-blur-md border-t border-stroke-base flex items-center justify-around px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5">
          <span className="font-display text-lg text-veil-400">&#x2728;</span>
        </Link>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex flex-col items-center gap-0.5 text-content-secondary"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-veil-500 text-white text-[10px] flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* DM */}
        <button
          type="button"
          aria-label="Messages"
          className="flex flex-col items-center gap-0.5 text-content-secondary"
        >
          <MessageSquare className="h-5 w-5" />
        </button>

        {/* Wallet */}
        <button
          type="button"
          aria-label="Wallet"
          className="flex flex-col items-center gap-0.5 text-content-secondary"
        >
          <div className="h-6 w-6 rounded-full bg-veil-700 flex items-center justify-center text-veil-300 text-xs font-body font-semibold">
            {address ? address.slice(2, 4).toUpperCase() : "?"}
          </div>
        </button>
      </div>
    </>
  );
}
