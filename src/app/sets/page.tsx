"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { useCollection } from "@/components/collection-provider";
import { useCurrency } from "@/components/currency-provider";
import { getSets } from "@/lib/cards/card-service";
import { getCatalogDebugState } from "@/lib/cards/api-card-service";
import { CardSet } from "@/lib/cards/types";
import { seedSets } from "@/lib/cards/seed-catalog";

const INITIAL_PAGE = 1;
const PAGE_SIZE = 24;

function formatReleaseDate(dateString?: string) {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return null;
  }
}

function getSeedSetPage(pageNum: number) {
  const start = (pageNum - 1) * PAGE_SIZE;
  return seedSets.slice(start, start + PAGE_SIZE);
}

function formatDebugMessage() {
  const debug = getCatalogDebugState();

  if (debug.status === "fallback") {
    return `Using cached/fallback sets. Live refresh issue: ${debug.statusCode ?? "n/a"}.`;
  }

  if (debug.status === "failed" || debug.status === "empty") {
    return `${debug.message ?? "Set catalog issue."} Backend: ${debug.baseUrl || "unset"}. Status: ${debug.statusCode ?? "n/a"}.`;
  }

  return null;
}

export default function SetsPage() {
  const { formatUsd } = useCurrency();
  const { cards: collectionCards } = useCollection();
  const [sets, setSets] = useState<CardSet[]>(() => getSeedSetPage(INITIAL_PAGE));
  const [page, setPage] = useState(INITIAL_PAGE);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const collectionBySetId = useMemo(() => {
    const map = new Map<string, { count: number; totalValue: number }>();
    collectionCards.forEach(({ card, quantity }) => {
      if (!card.setId) return;
      const existing = map.get(card.setId) ?? { count: 0, totalValue: 0 };
      map.set(card.setId, {
        count: existing.count + quantity,
        totalValue: existing.totalValue + (card.marketValue ?? 0) * quantity,
      });
    });
    return map;
  }, [collectionCards]);

  const loadSets = async (pageNum: number, isReset = false) => {
    setIsLoading(true);
    try {
      const fetchedSets = await getSets({ page: pageNum, pageSize: PAGE_SIZE });
      const nextSets = fetchedSets.length > 0 ? fetchedSets : getSeedSetPage(pageNum);

      if (isReset) {
        setSets(nextSets);
      } else {
        setSets((current) => {
          const byId = new Map(current.map((set) => [set.id, set]));
          nextSets.forEach((set) => {
            byId.set(set.id, set);
          });
          return Array.from(byId.values());
        });
      }

      setHasMore(nextSets.length === PAGE_SIZE);
      const message = formatDebugMessage();
      if (message) {
        setDebugMessage(message);
      } else if (nextSets.length > 0) {
        setDebugMessage(null);
      }
    } catch {
      const fallbackPage = getSeedSetPage(pageNum);
      if (fallbackPage.length > 0) {
        setSets((current) => {
          const byId = new Map(current.map((set) => [set.id, set]));
          fallbackPage.forEach((set) => {
            byId.set(set.id, set);
          });
          return Array.from(byId.values());
        });
      }
      setDebugMessage(formatDebugMessage() ?? "Using cached/fallback sets while live catalog refreshes.");
      setHasMore(fallbackPage.length === PAGE_SIZE);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadSets(INITIAL_PAGE, true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || isLoading || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }

        const nextPage = page + 1;
        setPage(nextPage);
        loadSets(nextPage);
      },
      {
        root: null,
        rootMargin: "200px 0px",
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [page, isLoading, hasMore]);

  return (
    <MobileShell title="Browse Sets" subtitle="Explore cards by set and era." showBackButton backFallbackHref="/search">
      <section className="space-y-3">
        <article className="rounded-2xl border border-[#27272a] bg-[#15161a] p-4 text-sm text-zinc-400">
          Tap any set to open its card list, then open a card for value, trust signal, and actions.
        </article>

        {debugMessage ? (
          <article className="rounded-xl border border-amber-400/20 bg-[#11100b] p-2.5 text-[11px] text-amber-100/75">
            Debug: {debugMessage}
          </article>
        ) : null}

        {isInitialLoad ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e1b54f] border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {sets.map((set) => {
                const collectionData = collectionBySetId.get(set.id);
                const progress = collectionData
                  ? `${collectionData.count}/${set.totalCards}`
                  : `0/${set.totalCards}`;
                const totalValue = collectionData?.totalValue ?? 0;
                const releaseDate = formatReleaseDate(set.releaseDate);

                return (
                  <Link
                    key={set.id}
                    href={`/detail?type=set&id=${set.id}`}
                    className="overflow-hidden rounded-xl border border-[#2a2a30] bg-[#15161a] shadow-[0_3px_12px_rgba(0,0,0,0.2)]"
                  >
                    <div className="relative aspect-square bg-[#111216]">
                      {set.imageLogo ? (
                        <img
                          src={set.imageLogo}
                          alt={`${set.name} logo`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain p-4"
                        />
                      ) : set.imageSymbol ? (
                        <img
                          src={set.imageSymbol}
                          alt={`${set.name} symbol`}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-contain p-4"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl">{set.icon}</div>
                      )}
                      {releaseDate ? (
                        <div className="absolute top-2 right-2 rounded-full border border-[#2b2b31] bg-[#121318]/90 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-zinc-300 backdrop-blur">
                          {releaseDate}
                        </div>
                      ) : null}
                    </div>
                    <div className="space-y-1.5 p-2">
                      <p className="line-clamp-1 text-xs font-semibold text-white">{set.name}</p>
                      <p className="text-[11px] text-zinc-400">
                        {set.totalCards} cards
                      </p>
                      <div className="flex items-center justify-between gap-1 rounded-lg border border-[#2d2d33] bg-[#111216] px-2 py-1">
                        <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Progress</p>
                        <p className="text-[11px] font-semibold text-[#e1b54f]">{progress}</p>
                      </div>
                      {totalValue > 0 ? (
                        <div className="flex items-center justify-between gap-1 rounded-lg border border-[#2d2d33] bg-[#111216] px-2 py-1">
                          <p className="text-[10px] uppercase tracking-[0.08em] text-zinc-500">Total Value</p>
                          <p className="text-[11px] font-semibold text-white">{formatUsd(totalValue)}</p>
                        </div>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>

            {isLoading && !isInitialLoad ? (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e1b54f] border-t-transparent" />
              </div>
            ) : null}

            {!hasMore && sets.length > 0 ? (
              <div className="flex justify-center py-4">
                <p className="text-xs text-zinc-500">No more sets</p>
              </div>
            ) : null}

            {hasMore ? (
              <div ref={loadMoreRef} className="h-4" />
            ) : null}
          </>
        )}
      </section>
    </MobileShell>
  );
}
