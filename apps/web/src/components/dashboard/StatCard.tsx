import { clsx } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";

import { Card } from "@/components/ui/Card";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  trend?: "up" | "down" | "neutral";
}

// ─── TrendIndicator ───────────────────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") {
    return (
      <span className="text-xs font-medium text-shard-400 flex items-center gap-0.5">
        <svg
          className="h-3 w-3"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 2L10 6H7V10H5V6H2L6 2Z" fill="currentColor" />
        </svg>
        Up
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="text-xs font-medium text-blood-400 flex items-center gap-0.5">
        <svg
          className="h-3 w-3"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M6 10L2 6H5V2H7V6H10L6 10Z" fill="currentColor" />
        </svg>
        Down
      </span>
    );
  }
  return <span className="text-xs font-medium text-content-muted">—</span>;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  icon,
  className,
  trend,
}: StatCardProps) {
  return (
    <Card className={cn("flex flex-col gap-3 min-w-0", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-content-muted font-body">
          {label}
        </span>
        {icon && (
          <span className="text-content-muted shrink-0 h-4 w-4 flex items-center justify-center">
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="font-display text-2xl font-bold text-content-primary leading-none truncate">
          {value}
        </span>
        {trend && <TrendIndicator trend={trend} />}
      </div>
    </Card>
  );
}
