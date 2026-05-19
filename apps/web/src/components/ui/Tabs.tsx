"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { clsx } from "clsx";
import * as React from "react";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export interface TabItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  defaultValue?: string;
  className?: string;
}

export function Tabs({ tabs, defaultValue, className }: TabsProps) {
  const initialValue = defaultValue ?? tabs[0]?.value ?? "";

  return (
    <TabsPrimitive.Root
      defaultValue={initialValue}
      className={cn("w-full", className)}
    >
      <TabsPrimitive.List className="border-b border-stroke-base flex gap-1">
        {tabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "px-4 py-2 text-sm text-content-muted transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400",
              "data-[state=active]:text-veil-400 data-[state=active]:border-b-2 data-[state=active]:border-veil-500",
            )}
          >
            {tab.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {tabs.map((tab) => (
        <TabsPrimitive.Content
          key={tab.value}
          value={tab.value}
          className="pt-4"
        >
          {tab.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
