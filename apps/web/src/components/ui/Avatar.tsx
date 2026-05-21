import { clsx } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export interface AvatarProps {
  src?: string;
  address?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
};

export function Avatar({ src, address, size = "md", className }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <img
        src={src}
        alt={address ?? "Avatar"}
        className={cn("rounded-full object-cover", sizeClass, className)}
      />
    );
  }

  const label = address ? address.slice(0, 4) : "??";

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-veil-600 to-shard-600",
        "flex items-center justify-center font-body font-semibold text-white select-none",
        sizeClass,
        className,
      )}
      aria-label={address ?? "Avatar"}
    >
      {label}
    </div>
  );
}
