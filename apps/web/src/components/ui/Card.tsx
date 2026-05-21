import { clsx } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export type CardRarityVariant =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  rarity?: CardRarityVariant;
  className?: string;
  children?: React.ReactNode;
}

export function Card({ rarity, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-card border border-stroke-base rounded-lg p-4",
        rarity && `border-rarity-${rarity} glow-rarity-${rarity}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
