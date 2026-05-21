"use client";

import { ArrowLeftRight, Package, Swords, Wrench } from "lucide-react";
import Link from "next/link";
import * as React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuickActionItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

// ─── Action definitions ───────────────────────────────────────────────────────

const ACTIONS: QuickActionItem[] = [
  {
    label: "Open Pack",
    href: "/pack",
    icon: <Package className="h-6 w-6" />,
    description: "Reveal new cards",
  },
  {
    label: "Find Match",
    href: "/battle",
    icon: <Swords className="h-6 w-6" />,
    description: "Enter the arena",
  },
  {
    label: "Craft",
    href: "/crafting",
    icon: <Wrench className="h-6 w-6" />,
    description: "Forge new cards",
  },
  {
    label: "Trade",
    href: "/trade",
    icon: <ArrowLeftRight className="h-6 w-6" />,
    description: "Swap with others",
  },
];

// ─── QuickActionCard ──────────────────────────────────────────────────────────

function QuickActionCard({ item }: { item: QuickActionItem }) {
  return (
    <Link
      href={item.href}
      className="
        group flex flex-col items-center gap-3 rounded-lg p-4
        bg-surface-card border border-stroke-base
        hover:bg-veil-900/50 hover:border-veil-700
        transition-colors duration-150 text-center min-w-0
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400
      "
    >
      <span className="text-veil-400 group-hover:text-veil-300 transition-colors">
        {item.icon}
      </span>
      <div>
        <p className="font-display text-sm font-semibold text-content-primary leading-tight">
          {item.label}
        </p>
        <p className="font-body text-xs text-content-muted mt-0.5">
          {item.description}
        </p>
      </div>
    </Link>
  );
}

// ─── QuickActions ─────────────────────────────────────────────────────────────

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ACTIONS.map((action) => (
        <QuickActionCard key={action.href} item={action} />
      ))}
    </div>
  );
}
