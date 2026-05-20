"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

// ─── CardSearchInput ──────────────────────────────────────────────────────────

export function CardSearchInput() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync if URL param changes externally (e.g. browser back/fwd)
  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  const pushQuery = useCallback(
    (query: string) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (query.trim()) {
          params.set("q", query.trim());
        } else {
          params.delete("q");
        }
        params.delete("page");
        router.replace(`?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setValue(next);

      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        pushQuery(next);
      }, 300);
    },
    [pushQuery],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <label htmlFor="card-search" className="sr-only">
        Search cards
      </label>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted"
      />
      <input
        id="card-search"
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Search cards…"
        autoComplete="off"
        spellCheck={false}
        className={[
          "w-full rounded-xl border border-stroke-base bg-surface-elevated",
          "py-2.5 pl-9 pr-4 font-body text-sm text-content-primary",
          "placeholder:text-content-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-veil-400 focus-visible:border-transparent",
          "transition-colors duration-200",
        ].join(" ")}
        aria-label="Search cards"
      />
    </div>
  );
}
