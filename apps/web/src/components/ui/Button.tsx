"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";

import { Spinner } from "./Spinner";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-md font-body font-medium",
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      intent: {
        primary:
          "bg-veil-600 hover:bg-veil-500 text-white border border-veil-500",
        secondary:
          "bg-surface-overlay border border-stroke-emphasis text-content-primary hover:bg-surface-card",
        ghost:
          "bg-transparent hover:bg-surface-overlay text-content-secondary hover:text-content-primary",
        danger:
          "bg-blood-700 hover:bg-blood-600 text-white border border-blood-600",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      intent: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, intent, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ intent, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
