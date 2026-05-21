"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { type CardData, CardThumbnail } from "./CardThumbnail";

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const PAGE_SIZE = 24;

const RARITY_NAMES: Record<number, string> = {
  0: "COMMON",
  1: "UNCOMMON",
  2: "RARE",
  3: "EPIC",
  4: "LEGENDARY",
  5: "MYTHIC",
};

interface CardsApiResponse {
  data: Array<{
    cardId: number;
    rarity: number;
    cardType: number;
    atkBase: number;
    defBase: number;
    spdBase: number;
    hpBase: number;
    supplyCap: string;
    minted: string;
    active: boolean;
    poolId: number;
  }>;
  total: number;
  page: number;
  pageSize: number;
  cachedAt: string;
}

type PageResult = { cards: CardData[]; total: number; page: number };

async function fetchCards({
  page,
  rarities,
  sort,
  q,
}: {
  page: number;
  rarities: string[];
  sort: string;
  q: string;
}): Promise<PageResult> {
  const params = new URLSearchParams({
    pageSize: String(PAGE_SIZE),
    page: String(page),
  });
  rarities.forEach((r) => params.append("rarity", r));
  if (sort) params.set("sort", sort);
  if (q) params.set("q", q);

  const res = await fetch(`${API_URL}/cards?${params.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch cards: ${res.status}`);

  const data = (await res.json()) as CardsApiResponse;
  return {
    cards: data.data.map((c) => ({
      id: c.cardId,
      name: `Card #${c.cardId}`,
      rarity: RARITY_NAMES[c.rarity] ?? "COMMON",
      imageUrl: null,
      minted: Number(c.minted),
      supplyCap: Number(c.supplyCap),
    })),
    total: data.total,
    page: data.page,
  };
}

// Skeleton card placeholder
function CardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-stroke-base bg-surface-card"
    >
      <div className="aspect-[3/4] w-full motion-safe:animate-pulse bg-surface-elevated" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3.5 w-2/3 rounded motion-safe:animate-pulse bg-surface-elevated" />
        <div className="h-1.5 w-full rounded-full motion-safe:animate-pulse bg-surface-elevated" />
        <div className="h-2.5 w-1/2 rounded motion-safe:animate-pulse bg-surface-elevated" />
      </div>
    </div>
  );
}

// Inner component that always has initialData (for SSR hydration path)
function CardGridWithInitialData({
  initialCards,
  initialTotal,
  rarities,
  sort,
  q,
}: {
  initialCards: CardData[];
  initialTotal: number;
  rarities: string[];
  sort: string;
  q: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["cards", { rarities, sort, q }] as const,
      queryFn: ({ pageParam }: { pageParam: number }) =>
        fetchCards({ page: pageParam, rarities, sort, q }),
      initialPageParam: 1,
      getNextPageParam: (lastPage: PageResult) => {
        const fetched = lastPage.page * PAGE_SIZE;
        return fetched < lastPage.total ? lastPage.page + 1 : undefined;
      },
      initialData: {
        pages: [{ cards: initialCards, total: initialTotal, page: 1 }],
        pageParams: [1],
      },
      staleTime: 60_000,
    });

  const allCards = data.pages.flatMap((p) => p.cards);
  const total = data.pages[0]?.total ?? initialTotal;

  return (
    <CardGridBody
      allCards={allCards}
      total={total}
      sentinelRef={sentinelRef}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      isLoading={false}
      isError={false}
    />
  );
}

// Inner component without initialData (for filtered/searched queries)
function CardGridFiltered({
  rarities,
  sort,
  q,
}: {
  rarities: string[];
  sort: string;
  q: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["cards", { rarities, sort, q }] as const,
    queryFn: ({ pageParam }: { pageParam: number }) =>
      fetchCards({ page: pageParam, rarities, sort, q }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PageResult) => {
      const fetched = lastPage.page * PAGE_SIZE;
      return fetched < lastPage.total ? lastPage.page + 1 : undefined;
    },
    staleTime: 60_000,
  });

  const allCards = data?.pages.flatMap((p) => p.cards) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <CardGridBody
      allCards={allCards}
      total={total}
      sentinelRef={sentinelRef}
      fetchNextPage={fetchNextPage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      isLoading={isLoading}
      isError={isError}
    />
  );
}

// Shared rendering body
function CardGridBody({
  allCards,
  total,
  sentinelRef,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isError,
}: {
  allCards: CardData[];
  total: number;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isError: boolean;
}) {
  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, sentinelRef]);

  if (isLoading) {
    return (
      <div
        aria-live="polite"
        aria-busy="true"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-display text-lg text-content-secondary">
          Failed to load cards.
        </p>
        <p className="font-body text-sm text-content-muted">
          Please try again later.
        </p>
      </div>
    );
  }

  if (allCards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <svg
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
          className="h-14 w-14 text-content-muted opacity-30"
        >
          <rect
            x="4"
            y="4"
            width="56"
            height="56"
            rx="8"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M20 44l8-12 8 8 8-12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p className="font-display text-lg font-semibold text-content-secondary">
          No cards found.
        </p>
        <p className="font-body text-sm text-content-muted">
          No cards found. Adjust your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Result count */}
      <p aria-live="polite" className="font-body text-sm text-content-muted">
        Showing{" "}
        <span className="font-semibold text-content-secondary">
          {allCards.length}
        </span>{" "}
        of <span className="font-semibold text-content-secondary">{total}</span>{" "}
        cards
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {allCards.map((card) => (
          <CardThumbnail key={card.id} {...card} />
        ))}

        {/* Skeleton tiles while fetching next page */}
        {isFetchingNextPage &&
          Array.from({ length: 6 }, (_, i) => <CardSkeleton key={`sk-${i}`} />)}
      </div>

      {/* Sentinel for IntersectionObserver */}
      <div ref={sentinelRef} aria-hidden="true" className="h-4 w-full" />

      {/* End of list message */}
      {!hasNextPage && allCards.length > 0 && (
        <p className="pb-4 text-center font-body text-xs text-content-muted">
          You&apos;ve reached the end of the catalog.
        </p>
      )}
    </div>
  );
}

// Public CardGrid — chooses the right inner variant
interface CardGridProps {
  initialCards: CardData[];
  initialTotal: number;
}

export function CardGrid({ initialCards, initialTotal }: CardGridProps) {
  const searchParams = useSearchParams();
  const rarities = searchParams.getAll("rarity");
  const sort = searchParams.get("sort") ?? "newest";
  const q = searchParams.get("q") ?? "";

  const isUnfiltered = rarities.length === 0 && sort === "newest" && q === "";

  if (isUnfiltered) {
    return (
      <CardGridWithInitialData
        initialCards={initialCards}
        initialTotal={initialTotal}
        rarities={rarities}
        sort={sort}
        q={q}
      />
    );
  }

  return <CardGridFiltered rarities={rarities} sort={sort} q={q} />;
}
