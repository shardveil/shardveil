import { clsx } from "clsx";
import { Package } from "lucide-react";
import * as React from "react";
import { twMerge } from "tailwind-merge";

import { Button } from "./Button";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 text-center",
        className,
      )}
    >
      <div className="text-content-muted h-12 w-12 flex items-center justify-center">
        {icon ?? <Package className="h-12 w-12" />}
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-content-primary text-lg">{title}</h3>
        {description && (
          <p className="text-content-muted text-sm max-w-sm">{description}</p>
        )}
      </div>
      {action && (
        <Button intent="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
