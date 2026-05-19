"use client";

import {
  ArrowLeftRight,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Hammer,
  LayoutDashboard,
  Library,
  Package,
  ScrollText,
  Shield,
  ShoppingCart,
  Star,
  Swords,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ElementType, useState } from "react";

import { useUiStore } from "@/stores/uiStore";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  icon: ElementType;
  label: string;
  disabled?: boolean;
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/pack", icon: Package, label: "Pack" },
  { href: "/collection", icon: Library, label: "Collection" },
  { href: "/battle", icon: Swords, label: "Battle" },
  { href: "/crafting", icon: Hammer, label: "Crafting" },
  { href: "/market", icon: ShoppingCart, label: "Market" },
  { href: "/trade", icon: ArrowLeftRight, label: "Trade" },
  { href: "/guild", icon: Shield, label: "Guild" },
  { href: "/tournament", icon: Trophy, label: "Tournament" },
  { href: "/quests", icon: ScrollText, label: "Quests", disabled: true },
  { href: "/season", icon: Star, label: "Season" },
  { href: "/social", icon: Users, label: "Social" },
  { href: "/leaderboard", icon: BarChart2, label: "Leaderboard" },
  { href: "/wallet", icon: Wallet, label: "Wallet" },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUiStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* ── Mobile overlay backdrop ── */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside
        className={[
          "flex flex-col h-full bg-surface-elevated border-r border-stroke-base transition-all duration-300 z-40 shrink-0",
          // Desktop: inline, toggled via collapsed state
          collapsed ? "md:w-16" : "md:w-64",
          // Mobile: fixed, slide in from left
          "fixed md:relative top-0 left-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          // Full height
          "h-screen",
        ].join(" ")}
      >
        {/* ── Nav items ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  title="Coming Soon"
                  aria-label={`${item.label} — Coming Soon`}
                  className={[
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-body",
                    "text-content-muted cursor-not-allowed select-none",
                    collapsed ? "justify-center" : "",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && (
                    <span className="ml-auto text-[10px] text-content-muted border border-stroke-base rounded px-1 py-0.5 hidden group-hover:inline">
                      Soon
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                className={[
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-body transition-colors",
                  collapsed ? "justify-center" : "",
                  isActive
                    ? "bg-veil-900/50 text-veil-400 border-l-2 border-veil-500"
                    : "text-content-secondary hover:bg-surface-overlay hover:text-content-primary",
                  isActive && collapsed
                    ? "border-l-0 border-l-transparent"
                    : "",
                ].join(" ")}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* ── Collapse toggle (desktop only) ── */}
        <div className="hidden md:flex shrink-0 border-t border-stroke-base p-2 justify-end">
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-md p-2 text-content-muted hover:text-content-primary hover:bg-surface-overlay transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
