import type { CardRarity } from "@shardveil/shared";
import { clsx } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

/** Lowercase rarity for CSS class generation */
type RarityLower =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

function toLowerRarity(rarity: CardRarity): RarityLower {
  return rarity.toLowerCase() as RarityLower;
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "rarity" | "status";
  rarity?: CardRarity;
  children: React.ReactNode;
  className?: string;
}

export function Badge({
  variant = "default",
  rarity,
  children,
  className,
  ...props
}: BadgeProps) {
  if (variant === "rarity" && rarity) {
    const r = toLowerRarity(rarity);
    return (
      <span
        className={cn(
          `bg-rarity-${r}/20 text-rarity-${r} border border-rarity-${r}/40`,
          "rounded-full px-2 py-0.5 text-xs font-medium",
          className,
        )}
        {...props}
      >
        {children}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "bg-surface-overlay text-content-secondary border border-stroke-base rounded-full px-2 py-0.5 text-xs",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
