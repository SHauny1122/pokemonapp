"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrency } from "@/components/currency-provider";
import { MobileShell } from "@/components/mobile-shell";
import { Card, CardSet } from "@/lib/cards/types";
import { getSets, searchCards } from "@/lib/cards/card-service";

const SEARCH_DEBOUNCE_MS = 400;

export default function SearchPage() {
  const { formatUsd } = useCurrency();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<Card[]>([]);
  const [sets, setSets] = useState<CardSet[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(true);
  const [isLoadingSets, setIsLoadingSets] = useState(true);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [setsError, setSetsError] = useState<string | null>(null);

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

  return (
    <MobileShell title="Discover" subtitle="Scan first, or search cards by name, set, and number.">
      <section className="space-y-4">
        <article className="rounded-2xl border border-[#3a2e10] bg-gradient-to-br from-[#241d0f] to-[#121317] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[#e1b54f]">Fastest Way</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Scan Card</h2>
          <p className="mt-1 text-sm text-zinc-300">Use your camera to identify a card, then review value and add it to your collection.</p>
          <Link
            href="/scan"
            className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#e1b54f] px-4 py-3 text-sm font-semibold text-[#141519]"
          >
            Scan Card
          </Link>
        </article>

        <article className="rounded-2xl border border-[#27272a] bg-[#15161a] p-4">
          <label className="text-xs uppercase tracking-[0.16em] text-zinc-400">Search Cards</label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try: Charizard, Base Set, 4/102, Holo Rare, Fire"
            className="mt-2 w-full rounded-xl border border-[#323232] bg-[#0f1012] px-3 py-3 text-sm text-white outline-none ring-[#e1b54f] placeholder:text-zinc-500 focus:ring-2"
          />
        </article>

        <article className="rounded-2xl border border-[#27272a] bg-[#15161a] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white">Browse Sets</p>
            <Link href="/sets" className="text-xs font-semibold text-[#e1b54f]">
              View all
            </Link>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {isLoadingSets ? (
              <div className="rounded-xl border border-dashed border-[#3a3a3a] bg-[#121317] px-3 py-2 text-xs text-zinc-400">
                Loading sets...
              </div>
            ) : null}

            {!isLoadingSets && setsError ? (
              <div className="rounded-xl border border-dashed border-[#4a3e2a] bg-[#1a1610] px-3 py-2 text-xs text-amber-200">
                {setsError}
              </div>
            ) : null}

            {sets.map((set) => (
              <Link
                key={set.id}
                href={`/sets/${set.id}`}
                className="shrink-0 rounded-xl border border-[#2e2e2e] bg-[#101114] px-3 py-2"
              >
                <p className="text-xs text-zinc-400">{set.icon} {set.releaseYear}</p>
                <p className="text-sm font-semibold text-white">{set.name}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="space-y-3">
          {isLoadingResults ? (
            <div className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
              Loading cards...
            </div>
          ) : null}

          {!isLoadingResults && resultsError ? (
            <div className="rounded-2xl border border-dashed border-[#4a3e2a] bg-[#1a1610] p-4 text-sm text-amber-200">
              {resultsError}
            </div>
          ) : null}

          {!isLoadingResults && !resultsError && results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
              <p>No cards matched that search.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/scan"
                  className="inline-flex items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-3 py-2 text-xs font-medium text-white"
                >
                  Scan Card
                </Link>
                <Link
                  href="/sets"
                  className="inline-flex items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-3 py-2 text-xs font-medium text-white"
                >
                  Browse Sets
                </Link>
              </div>
            </div>
          ) : null}

          {!isLoadingResults && !resultsError
            ? results.map((card) => (
            <Link
              key={card.id}
              href={`/cards/${card.id}`}
              className="flex items-center justify-between rounded-2xl border border-[#292929] bg-[#15161a] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{card.name}</p>
                <p className="text-xs text-zinc-400">
                  {card.set} • {card.number} • {card.rarity}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Type: {card.type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {card.marketValue !== null ? formatUsd(card.marketValue) : "Price unavailable"}
                </p>
                <p className="text-xs text-[#e1b54f]">Flip {card.flipScore}</p>
              </div>
            </Link>
              ))
            : null}
        </article>
      </section>
    </MobileShell>
  );
}
