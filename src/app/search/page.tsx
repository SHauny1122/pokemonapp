"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/mobile-shell";
import { useCurrency } from "@/components/currency-provider";
import { Card, CardSet } from "@/lib/cards/types";
import { getSets, searchCards } from "@/lib/cards/card-service";

const SEARCH_DEBOUNCE_MS = 400;

type SortOption =
  | "trending"
  | "price-high"
  | "price-low"
  | "price-change"
  | "card-number"
  | "product-name"
  | "date-added";

const sortOptions: { value: SortOption; label: string; description: string }[] = [
  { value: "trending", label: "Trending / Popularity", description: "Highest market signal first" },
  { value: "price-high", label: "Price high to low", description: "Most valuable cards first" },
  { value: "price-low", label: "Price low to high", description: "Lowest priced cards first" },
  { value: "price-change", label: "Price change", description: "Strongest upward movement first" },
  { value: "card-number", label: "Card number", description: "Set collector order" },
  { value: "product-name", label: "Product name", description: "Alphabetical by card name" },
  { value: "date-added", label: "Date added", description: "Recently updated cards first" },
];

function isRemoteImage(value: string | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function getCardImage(card: Card) {
  return card.imageSmall ?? card.image;
}

function getPrice(card: Card) {
  return card.marketValue ?? Number.POSITIVE_INFINITY;
}

function getPriceHigh(card: Card) {
  return card.marketValue ?? 0;
}

function getPriceChangeScore(card: Card) {
  if (card.history.length >= 2) {
    const first = card.history[0]?.value ?? 0;
    const last = card.history[card.history.length - 1]?.value ?? 0;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }

  const cardmarket = card.cardmarketPrices;
  if (cardmarket?.market !== undefined && cardmarket.mid !== undefined && cardmarket.mid > 0) {
    return ((cardmarket.market - cardmarket.mid) / cardmarket.mid) * 100;
  }

  if (card.trend === "up") return 3;
  if (card.trend === "down") return -3;
  return 0;
}

function getPopularityScore(card: Card) {
  const trendBoost = card.trend === "up" ? 18 : card.trend === "flat" ? 6 : 0;
  const valueBoost = Math.min(card.marketValue ?? 0, 500) / 25;
  const priceChangeBoost = Math.max(getPriceChangeScore(card), 0) * 1.5;

  return card.flipScore + trendBoost + valueBoost + priceChangeBoost;
}

function getSortableDate(card: Card) {
  const rawDate = card.priceUpdatedAt ?? card.releaseDate;
  const timestamp = rawDate ? new Date(rawDate).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getCardNumberValue(card: Card) {
  const match = card.number.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

function getSortedCards(cards: Card[], sortOption: SortOption) {
  return [...cards].sort((a, b) => {
    if (sortOption === "price-high") {
      return getPriceHigh(b) - getPriceHigh(a);
    }

    if (sortOption === "price-low") {
      return getPrice(a) - getPrice(b);
    }

    if (sortOption === "price-change") {
      return getPriceChangeScore(b) - getPriceChangeScore(a);
    }

    if (sortOption === "card-number") {
      return getCardNumberValue(a) - getCardNumberValue(b) || a.name.localeCompare(b.name);
    }

    if (sortOption === "product-name") {
      return a.name.localeCompare(b.name);
    }

    if (sortOption === "date-added") {
      return getSortableDate(b) - getSortableDate(a);
    }

    return getPopularityScore(b) - getPopularityScore(a);
  });
}

function TrendBadge({ card }: { card: Card }) {
  const priceChange = getPriceChangeScore(card);
  const isUp = priceChange > 0;
  const isDown = priceChange < 0;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${
        isUp
          ? "bg-emerald-400/10 text-emerald-300"
          : isDown
            ? "bg-rose-400/10 text-rose-300"
            : "bg-zinc-500/10 text-zinc-300"
      }`}
    >
      {isUp ? "+" : ""}
      {priceChange.toFixed(1)}%
    </span>
  );
}

function CardImage({ card, className }: { card: Card; className: string }) {
  const image = getCardImage(card);

  if (isRemoteImage(image)) {
    return <img src={image} alt={card.name} loading="lazy" decoding="async" className={className} />;
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#111318] text-center text-xs font-semibold text-zinc-500">
      No image
    </div>
  );
}

function TrendingCard({ card }: { card: Card }) {
  const { formatUsd } = useCurrency();

  return (
    <Link
      href={`/detail?type=card&id=${card.id}`}
      className="overflow-hidden rounded-xl border border-[#252a32] bg-[#11141a] shadow-[0_10px_24px_rgba(0,0,0,0.25)]"
    >
      <div className="relative aspect-[5/7] bg-[#0d0f13]">
        <CardImage card={card} className="h-full w-full object-contain p-1.5" />
        <div className="absolute top-2 left-2 rounded-full border border-[#e1b54f]/30 bg-[#17130a]/90 px-2 py-1 text-[10px] font-semibold text-[#e1b54f] backdrop-blur">
          {Math.round(getPopularityScore(card))}
        </div>
      </div>
      <div className="space-y-2 p-2">
        <p className="line-clamp-1 text-xs font-semibold text-white">{card.name}</p>
        <div className="flex min-h-5 items-center justify-between gap-1">
          <p className="truncate text-[11px] text-zinc-400">{card.set}</p>
          <TrendBadge card={card} />
        </div>
        <p className="text-xs font-semibold text-white">
          {card.marketValue !== null ? formatUsd(card.marketValue) : "No price"}
        </p>
      </div>
    </Link>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [sets, setSets] = useState<CardSet[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [setsError, setSetsError] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("trending");
  const [isSortSheetOpen, setIsSortSheetOpen] = useState(false);

  const sortedResults = useMemo(() => getSortedCards(results, sortOption), [results, sortOption]);
  const activeSortLabel = sortOptions.find((option) => option.value === sortOption)?.label ?? "Sort";

  useEffect(() => {
    let cancelled = false;

    const loadSets = async () => {
      try {
        setIsLoadingSets(true);
        setSetsError(null);
        const nextSets = await getSets();

        if (!cancelled) {
          setSets(nextSets);
        }
      } catch {
        if (!cancelled) {
          setSetsError("Unable to load sets right now.");
          setSets([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSets(false);
        }
      }
    };

    loadSets();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const loadResults = async () => {
      try {
        setIsLoadingResults(true);
        setResultsError(null);
        const nextResults = await searchCards(debouncedQuery);

        if (!cancelled) {
          setResults(nextResults);
        }
      } catch {
        if (!cancelled) {
          setResultsError("Search is unavailable right now.");
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingResults(false);
        }
      }
    };

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    if (!isSortSheetOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSortSheetOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortSheetOpen]);

  return (
    <MobileShell title="Discover" subtitle="Find cards by name, set, and printing.">
      <section className="space-y-5">
        <article className="rounded-2xl bg-[#0d0f13] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Quick Add</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Scan Card</h2>
          <p className="mt-1 text-sm text-zinc-400">Use camera preview to identify a card, then review details before adding it.</p>
          <Link
            href="/scan"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#11151d] px-4 py-3 text-sm font-medium text-[#7dd3fc]"
          >
            Scan Card
          </Link>
        </article>

        <article className="rounded-2xl border border-[#242933] bg-[#0d0f13] p-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="discover-search-input" className="text-xs uppercase tracking-[0.16em] text-zinc-400">
              Search Cards
            </label>
            <button
              type="button"
              onClick={() => setIsSortSheetOpen(true)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#28303b] bg-[#111722] text-[#7dd3fc] transition active:scale-95"
              aria-label="Open sort and filters"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7h16" />
                <path d="M7 12h10" />
                <path d="M10 17h4" />
              </svg>
            </button>
          </div>
          <input
            id="discover-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Pokemon cards"
            className="mt-3 w-full rounded-xl border border-[#262a31] bg-[#0f1012] px-3 py-3 text-sm text-white outline-none ring-[#7dd3fc] placeholder:text-zinc-500 focus:ring-2"
          />
          <div className="mt-3 flex items-center justify-between gap-2 text-xs">
            <p className="text-zinc-500">
              {isLoadingResults ? "Loading cards..." : `${sortedResults.length} cards`}
            </p>
            <button
              type="button"
              onClick={() => setIsSortSheetOpen(true)}
              className="min-w-0 truncate rounded-full bg-[#131821] px-3 py-1.5 font-medium text-zinc-300"
            >
              {activeSortLabel}
            </button>
          </div>
        </article>

        <article className="rounded-2xl bg-[#0d0f13] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">Browse Sets</p>
            <Link href="/sets" className="text-xs font-medium text-[#7dd3fc]">
              View all
            </Link>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-[#101114] px-3 py-2.5">
            <p className="text-xs text-zinc-400">
              {isLoadingSets
                ? "Loading set catalog..."
                : setsError
                  ? "Set catalog is unavailable right now."
                  : `${sets.length} sets available`}
            </p>
            <Link href="/sets" className="text-xs font-medium text-[#7dd3fc]">
              Open sets
            </Link>
          </div>
        </article>

        <article className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{query.trim() ? "Search Results" : "Top Trending"}</p>
              <p className="text-xs text-zinc-500">Sorted by {activeSortLabel.toLowerCase()}.</p>
            </div>
          </div>

          {resultsError ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
              {resultsError}
            </div>
          ) : null}

          {isLoadingResults ? (
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="aspect-[5/8] animate-pulse rounded-xl bg-[#11141a]" />
              ))}
            </div>
          ) : sortedResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {sortedResults.map((card) => (
                <TrendingCard key={card.id} card={card} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#2b3038] bg-[#101318] p-4 text-sm text-zinc-400">
              Trending cards will appear when search data is available.
            </div>
          )}
        </article>
      </section>

      {isSortSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" role="presentation">
          <button
            type="button"
            aria-label="Close sort and filters"
            className="absolute inset-0 h-full w-full"
            onClick={() => setIsSortSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Sort cards"
            className="relative w-full max-w-md rounded-t-[28px] border border-[#262b34] bg-[#0d0f13] px-4 pb-5 pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.55)]"
            style={{
              paddingBottom: "calc(1.25rem + var(--safe-area-inset-bottom))",
            }}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-[#343a44]" />
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-white">Sort cards</p>
                <p className="mt-0.5 text-xs text-zinc-500">Choose how Discover orders the list.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSortSheetOpen(false)}
                aria-label="Close sort sheet"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#2b3038] bg-[#13161c] text-zinc-300"
              >
                x
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {sortOptions.map((option) => {
                const active = option.value === sortOption;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setSortOption(option.value);
                      setIsSortSheetOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition active:scale-[0.99] ${
                      active
                        ? "border-[#7dd3fc]/50 bg-[#102033] text-white"
                        : "border-[#242933] bg-[#11141a] text-zinc-200"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500">{option.description}</span>
                    </span>
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        active ? "border-[#7dd3fc] bg-[#7dd3fc] text-[#071016]" : "border-[#3a414d]"
                      }`}
                    >
                      {active ? (
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="m5 12 4 4L19 6" />
                        </svg>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </MobileShell>
  );
}
