"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CardCollectionActions } from "@/components/card-collection-actions";
import { useCurrency } from "@/components/currency-provider";
import { MobileShell } from "@/components/mobile-shell";
import { getCardById, getDealCheck, searchCards } from "@/lib/cards/card-service";
import { Card, DealCheckResult, DealVerdict } from "@/lib/cards/types";

function getVerdictTone(verdict: DealVerdict) {
  switch (verdict) {
    case "GOOD BUY":
      return {
        badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
        title: "text-emerald-300",
      };
    case "FAIR PRICE":
      return {
        badge: "border-sky-500/40 bg-sky-500/15 text-sky-300",
        title: "text-sky-300",
      };
    default:
      return {
        badge: "border-rose-500/40 bg-rose-500/15 text-rose-300",
        title: "text-rose-300",
      };
  }
}

function getTrendTone(result: DealCheckResult) {
  if (result.trend30d === "up") {
    return "text-emerald-300";
  }

  if (result.trend30d === "down") {
    return "text-rose-300";
  }

  return "text-zinc-200";
}

function getCardTrendTone(trend: Card["trend"]) {
  if (trend === "up") {
    return "text-emerald-300";
  }

  if (trend === "down") {
    return "text-rose-300";
  }

  return "text-zinc-300";
}

function DealResultSkeleton() {
  return (
    <article className="space-y-3 rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4">
      <div className="h-5 w-28 animate-pulse rounded bg-[#22252b]" />
      <div className="h-48 w-full animate-pulse rounded-2xl bg-[#1d2026]" />
      <div className="h-6 w-2/3 animate-pulse rounded bg-[#22252b]" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-16 animate-pulse rounded-xl bg-[#1d2026]" />
        <div className="h-16 animate-pulse rounded-xl bg-[#1d2026]" />
      </div>
      <div className="h-20 animate-pulse rounded-xl bg-[#1d2026]" />
    </article>
  );
}

function DealCheckContent() {
  const { formatUsd, selectedCurrencyCode, convertToUsd } = useCurrency();
  const searchParams = useSearchParams();
  const initialCardId = searchParams.get("cardId");
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(initialCardId);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [isLoadingCards, setIsLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [askingPrice, setAskingPrice] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isPreparingAnalysis, setIsPreparingAnalysis] = useState(false);
  const [isResultVisible, setIsResultVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCards = async () => {
      try {
        setIsLoadingCards(true);
        setCardsError(null);
        const nextCards = await searchCards(query);

        if (cancelled) {
          return;
        }

        setAllCards(nextCards);
        setSelectedCardId((current) => {
          if (current && nextCards.some((card) => card.id === current)) {
            return current;
          }

          return nextCards[0]?.id ?? null;
        });
      } catch {
        if (!cancelled) {
          setCardsError("Unable to load cards right now.");
          setAllCards([]);
          setSelectedCardId(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCards(false);
        }
      }
    };

    loadCards();

    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    if (!selectedCardId) {
      setSelectedCard(null);
      return;
    }

    const loadSelectedCard = async () => {
      const card = await getCardById(selectedCardId);

      if (!cancelled) {
        setSelectedCard(card ?? null);
      }
    };

    loadSelectedCard();

    return () => {
      cancelled = true;
    };
  }, [selectedCardId]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) {
      return allCards;
    }

    return allCards.filter((card) => {
      const searchable = [card.name, card.set, card.number, card.rarity, card.type].join(" ").toLowerCase();
      return searchable.includes(q);
    });
  }, [allCards, query]);

  const featuredCards = useMemo(() => {
    return [...allCards]
      .filter((card) => card.marketValue !== null)
      .sort((a, b) => {
        if (b.flipScore !== a.flipScore) {
          return b.flipScore - a.flipScore;
        }

        return (b.marketValue ?? 0) - (a.marketValue ?? 0);
      })
      .slice(0, 3);
  }, [allCards]);

  const hotSets = useMemo(() => {
    const setCountMap = new Map<string, number>();

    allCards.forEach((card) => {
      setCountMap.set(card.set, (setCountMap.get(card.set) ?? 0) + 1);
    });

    return [...setCountMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));
  }, [allCards]);

  const marketPulse = useMemo(() => {
    const up = allCards.filter((card) => card.trend === "up").length;
    const down = allCards.filter((card) => card.trend === "down").length;
    const avgFlip =
      allCards.length > 0
        ? Math.round(allCards.reduce((sum, card) => sum + card.flipScore, 0) / allCards.length)
        : 0;

    return { up, down, avgFlip };
  }, [allCards]);

  const askingPriceNumber = Number(askingPrice);
  const hasValidAskingPrice = Number.isFinite(askingPriceNumber) && askingPriceNumber > 0;
  const askingPriceUsd = hasValidAskingPrice ? convertToUsd(askingPriceNumber) : 0;
  const canAnalyze = Boolean(selectedCard && hasValidAskingPrice);

  const dealCheck = selectedCard && hasValidAskingPrice ? getDealCheck(selectedCard.id, askingPriceUsd) : undefined;

  useEffect(() => {
    setShowAnalysis(false);
    setIsPreparingAnalysis(false);
  }, [selectedCardId, askingPrice]);

  const handleAnalyze = () => {
    if (!canAnalyze) {
      return;
    }

    setIsPreparingAnalysis(true);
    setShowAnalysis(false);
    setIsResultVisible(false);

    window.setTimeout(() => {
      setShowAnalysis(true);
      setIsPreparingAnalysis(false);
    }, 240);
  };

  useEffect(() => {
    if (!showAnalysis || !dealCheck) {
      setIsResultVisible(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsResultVisible(true);
    }, 90);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [dealCheck, showAnalysis]);

  if (!selectedCard && isLoadingCards) {
    return (
      <MobileShell
        title="Deal Check"
        subtitle="Quickly judge if a listing is worth buying."
        showBackButton
        backFallbackHref="/search"
      >
        <section className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
          Loading cards...
        </section>
      </MobileShell>
    );
  }

  if (!selectedCard) {
    return (
      <MobileShell
        title="Deal Check"
        subtitle="Quickly judge if a listing is worth buying."
        showBackButton
        backFallbackHref="/search"
      >
        <section className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
          No cards available for deal check.
        </section>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title="Deal Check"
      subtitle="Use real sold-price context before you buy."
      showBackButton
      backFallbackHref="/search"
    >
      <section className="space-y-5">
        <article className="relative overflow-hidden rounded-2xl border border-[#2f3035] bg-gradient-to-br from-[#19170f] via-[#151820] to-[#101116] p-4">
          <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-[#e1b54f]/12 blur-2xl" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-[#6983a5]/18 blur-xl" />

          <p className="text-xs uppercase tracking-[0.18em] text-[#e1b54f]">Collector Intelligence</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Know before you buy.</h2>
          <p className="mt-1 text-sm text-zinc-300">
            Compare asking price against recent sold activity, trend direction, volatility, and liquidity signals.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-xl border border-[#383a43] bg-black/20 px-2.5 py-2">
              <p className="text-zinc-400">Market Up</p>
              <p className="mt-1 text-base font-semibold text-emerald-300">{marketPulse.up}</p>
            </div>
            <div className="rounded-xl border border-[#383a43] bg-black/20 px-2.5 py-2">
              <p className="text-zinc-400">Market Down</p>
              <p className="mt-1 text-base font-semibold text-rose-300">{marketPulse.down}</p>
            </div>
            <div className="rounded-xl border border-[#383a43] bg-black/20 px-2.5 py-2">
              <p className="text-zinc-400">Avg Flip</p>
              <p className="mt-1 text-base font-semibold text-white">{marketPulse.avgFlip}</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4 shadow-[0_16px_30px_rgba(0,0,0,0.25)]">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Deal Action</p>

          <label className="mt-3 block text-xs uppercase tracking-[0.16em] text-zinc-400">Choose Card</label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Charizard, Base Set..."
            className="mt-2 w-full rounded-xl border border-[#323232] bg-[#0f1012] px-3 py-3 text-sm text-white outline-none ring-[#e1b54f] placeholder:text-zinc-500 focus:ring-2"
          />

          {selectedCard ? (
            <div className="mt-3 rounded-xl border border-[#31343b] bg-[#101319] p-3">
              <div className="flex items-center gap-3">
                {selectedCard.image.startsWith("http://") || selectedCard.image.startsWith("https://") ? (
                  <img
                    src={selectedCard.image}
                    alt={selectedCard.name}
                    className="h-16 w-12 rounded-lg border border-[#2f3238] object-contain bg-[#0f1014]"
                  />
                ) : (
                  <div className="flex h-16 w-12 items-center justify-center rounded-lg border border-[#2f3238] bg-[#0f1014] text-2xl">
                    {selectedCard.image}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{selectedCard.name}</p>
                  <p className="truncate text-xs text-zinc-400">
                    {selectedCard.set} • {selectedCard.number} • {selectedCard.rarity}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <span className={getCardTrendTone(selectedCard.trend)}>{selectedCard.trend.toUpperCase()} TREND</span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-300">Flip {selectedCard.flipScore}</span>
                    {selectedCard.marketValue !== null ? (
                      <>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-300">{formatUsd(selectedCard.marketValue)} market</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {isLoadingCards ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#3a3a3a] bg-[#121317] px-3 py-3 text-xs text-zinc-400">
              Loading cards...
            </div>
          ) : null}

          {!isLoadingCards && cardsError ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#4a3e2a] bg-[#1a1610] px-3 py-3 text-xs text-amber-200">
              {cardsError}
            </div>
          ) : null}

          {!isLoadingCards && !cardsError && filteredCards.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#3a3a3a] bg-[#121317] px-3 py-3 text-xs text-zinc-400">
              No cards matched. Try a broader card name or set.
            </div>
          ) : null}

          {!isLoadingCards && !cardsError && filteredCards.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {filteredCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedCardId(card.id)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left text-xs ${
                    selectedCard?.id === card.id
                      ? "border-[#e1b54f] bg-[#2a220f] text-[#f3d897]"
                      : "border-[#2f2f2f] bg-[#101114] text-zinc-300"
                  }`}
                >
                  <p className="font-semibold">{card.name}</p>
                  <p className="text-[11px] text-zinc-400">
                    {card.set} • {card.number}
                  </p>
                </button>
              ))}
            </div>
          ) : null}

          <label className="mt-4 block text-xs uppercase tracking-[0.16em] text-zinc-400">
            Seller Asking Price ({selectedCurrencyCode})
          </label>
          <input
            value={askingPrice}
            onChange={(event) => setAskingPrice(event.target.value)}
            inputMode="decimal"
            placeholder="Enter asking price"
            className="mt-2 w-full rounded-xl border border-[#323232] bg-[#0f1012] px-3 py-3 text-sm text-white outline-none ring-[#e1b54f] placeholder:text-zinc-500 focus:ring-2"
          />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-xl border border-[#31343b] bg-[#12151b] px-3 py-2.5 text-xs text-zinc-300"
            >
              Scan Listing (Soon)
            </button>
            <button
              type="button"
              className="rounded-xl border border-[#31343b] bg-[#12151b] px-3 py-2.5 text-xs text-zinc-300"
            >
              Paste Listing URL (Soon)
            </button>
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`mt-3 inline-flex w-full items-center justify-center rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              canAnalyze
                ? "border-[#e1b54f]/60 bg-gradient-to-r from-[#2c2413] to-[#1f2230] text-[#f0d389] shadow-[0_8px_26px_rgba(225,181,79,0.18)]"
                : "border-[#35383f] bg-[#171a22] text-zinc-500"
            }`}
          >
            Analyze Deal
          </button>
        </article>

        {!showAnalysis ? (
          <div className="space-y-3">
            <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Trending Cards</p>
                <p className="text-xs text-zinc-500">Loaded market catalog</p>
              </div>

              {featuredCards.length > 0 ? (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {featuredCards.map((card) => (
                    <button
                      key={`featured-${card.id}`}
                      type="button"
                      onClick={() => setSelectedCardId(card.id)}
                      className="rounded-xl border border-[#2f3238] bg-[#101319] p-2 text-left"
                    >
                      <p className="line-clamp-2 text-xs font-semibold text-white">{card.name}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">Flip {card.flipScore}</p>
                      <p className="text-[11px] text-zinc-300">
                        {card.marketValue !== null ? formatUsd(card.marketValue) : "No price"}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-[#373941] bg-[#11131a] px-3 py-3 text-xs text-zinc-400">
                  Trending cards will appear after card data loads.
                </div>
              )}
            </article>

            <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4">
              <p className="text-sm font-medium text-white">Market Pulse</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-[#2f3238] bg-[#11131a] p-3 text-sm">
                  <p className="text-zinc-400">Hot Sets</p>
                  <div className="mt-1 space-y-1 text-xs text-zinc-200">
                    {hotSets.length > 0 ? (
                      hotSets.map((setItem) => (
                        <p key={setItem.name}>
                          {setItem.name} <span className="text-zinc-500">({setItem.count})</span>
                        </p>
                      ))
                    ) : (
                      <p className="text-zinc-400">Set data loading...</p>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border border-[#2f3238] bg-[#11131a] p-3 text-sm">
                  <p className="text-zinc-400">Deal Tip</p>
                  <p className="mt-1 text-xs text-zinc-200">
                    Strong buys usually show favorable pricing vs median sold with steady liquidity, not just high hype.
                  </p>
                </div>
              </div>
            </article>
          </div>
        ) : null}

        {isPreparingAnalysis ? <DealResultSkeleton /> : null}

        {showAnalysis && dealCheck ? (
          <article
            className={`space-y-4 rounded-2xl border border-[#2b2f36] bg-gradient-to-b from-[#191d24] to-[#13151a] p-4 transition duration-500 ${
              isResultVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
          >
            <div className="rounded-2xl border border-[#2f343d] bg-[#0f1218] p-3">
              {selectedCard.image.startsWith("http://") || selectedCard.image.startsWith("https://") ? (
                <img
                  src={selectedCard.image}
                  alt={selectedCard.name}
                  className="h-60 w-full rounded-xl border border-[#2f3238] object-contain bg-[#0f1014]"
                />
              ) : (
                <p className="text-5xl">{selectedCard.image}</p>
              )}
              <h2 className="mt-3 text-xl font-semibold text-white">{selectedCard.name}</h2>
              <p className="text-sm text-zinc-400">
                {selectedCard.set} • {selectedCard.number} • {selectedCard.rarity}
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${getVerdictTone(dealCheck.verdict).badge}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-200/80">Deal Verdict</p>
                  <p className={`mt-1 text-2xl font-semibold ${getVerdictTone(dealCheck.verdict).title}`}>
                    {dealCheck.verdict}
                  </p>
                </div>
                <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs text-zinc-100">
                  {dealCheck.confidence}% confidence
                </div>
              </div>
              <p className="mt-2 text-sm text-zinc-100">{dealCheck.explanation}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-[#30343c] bg-[#12151c] p-3">
                <p className="text-zinc-400">Asking Price</p>
                <p className="mt-1 text-lg font-semibold text-white">{formatUsd(dealCheck.askingPrice)}</p>
              </div>
              <div className="rounded-xl border border-[#30343c] bg-[#12151c] p-3">
                <p className="text-zinc-400">Median Sold</p>
                <p className="mt-1 text-lg font-semibold text-white">{formatUsd(dealCheck.medianSoldPrice)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-[#30343c] bg-[#12151c] p-3">
                <p className="text-zinc-400">Average Sold</p>
                <p className="mt-1 text-base font-semibold text-zinc-100">{formatUsd(dealCheck.averageSoldPrice)}</p>
              </div>
              <div className="rounded-xl border border-[#30343c] bg-[#12151c] p-3">
                <p className="text-zinc-400">Vs market</p>
                <p className={`mt-1 text-base font-semibold ${dealCheck.differencePercent <= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {dealCheck.differencePercent > 0 ? "+" : ""}
                  {dealCheck.differencePercent.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#30343c] bg-[#12151c] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">You save</p>
              <p
                className={`mt-1 text-2xl font-semibold ${
                  dealCheck.savingsAmount >= 0 ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {dealCheck.savingsAmount >= 0 ? "-" : "+"}
                {formatUsd(Math.abs(dealCheck.savingsAmount))}
              </p>
              <p className="mt-1 text-xs text-zinc-400">Compared to median recent sold price.</p>
            </div>

            <div className="rounded-2xl border border-[#30343c] bg-[#12151c] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Recent Sold Prices</p>
                <p className="text-xs text-zinc-500">Latest comps</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                {dealCheck.recentSoldPrices.map((price, index) => (
                  <div key={`${price}-${index}`} className="rounded-lg border border-[#30343c] bg-[#0f1218] px-2 py-2 text-center text-zinc-200">
                    {formatUsd(price)}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#30343c] bg-[#12151c] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Market Trend</p>
                <p className={`text-xs font-medium ${getTrendTone(dealCheck)}`}>
                  {dealCheck.trend30dPercent > 0 ? "+" : ""}
                  {dealCheck.trend30dPercent.toFixed(1)}% / 30d
                </p>
              </div>
              <div className="mt-3 flex items-end gap-1">
                {dealCheck.recentSoldPrices.map((price, index, all) => {
                  const min = Math.min(...all);
                  const max = Math.max(...all);
                  const height = ((price - min) / Math.max(max - min, 1)) * 48 + 14;

                  return (
                    <div key={`bar-${index}`} className="flex-1">
                      <div
                        className="w-full rounded-sm bg-gradient-to-t from-[#293042] to-[#6f7f9a]"
                        style={{ height }}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Volatility {dealCheck.volatilityPercent.toFixed(1)}% • {dealCheck.trend30d} trend
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#30343c] bg-[#12151c] p-3 text-sm">
                <p className="text-zinc-400">Collector demand</p>
                <p className="mt-1 text-lg font-semibold text-white">{dealCheck.demandScore}/100</p>
              </div>
              <div className="rounded-xl border border-[#30343c] bg-[#12151c] p-3 text-sm">
                <p className="text-zinc-400">Market activity</p>
                <p className="mt-1 text-lg font-semibold text-white">{dealCheck.activityLabel}</p>
                <p className="text-xs text-zinc-500">Liquidity {dealCheck.liquidityScore}/100</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#30343c] bg-[#12151c] p-4">
              <p className="text-sm font-medium text-white">Why this verdict</p>
              <ul className="mt-2 space-y-2 text-sm text-zinc-200">
                {dealCheck.insights.map((insight) => (
                  <li key={insight} className="rounded-lg border border-[#2c3038] bg-[#0f1218] px-3 py-2">
                    {insight}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-[#30343c] bg-[#12151c] p-4 text-sm">
              <p className="text-zinc-400">Signal breakdown</p>
              <div className="mt-2 space-y-2">
                {dealCheck.signalBreakdown.map((signal) => (
                  <div key={signal.key} className="rounded-lg border border-[#2c3038] bg-[#0f1218] px-3 py-2">
                    <div className="flex items-center justify-between text-xs">
                      <p className="text-zinc-300">{signal.label}</p>
                      <p className="text-zinc-400">{signal.valueText}</p>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#1f2229]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6f7f9a] to-[#e1b54f]"
                        style={{ width: `${signal.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-zinc-500">{dealCheck.flipScoreNote}</p>

            <CardCollectionActions cardId={selectedCard.id} />
            <Link
              href={`/cards/${selectedCard.id}`}
              className="inline-flex w-full items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-4 py-3 text-sm font-medium text-white"
            >
              Open Card Detail
            </Link>
          </article>
        ) : showAnalysis && hasValidAskingPrice && selectedCard && selectedCard.marketValue === null ? (
          <article className="rounded-2xl border border-dashed border-[#4a3e2a] bg-[#1a1610] p-4 text-sm text-amber-200">
            Price unavailable for this card right now. Try another listing or card.
          </article>
        ) : !showAnalysis ? null : (
          <article className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
            Enter an asking price to generate a conservative buy verdict using sold-price signals.
          </article>
        )}
      </section>
    </MobileShell>
  );
}

export default function DealCheckPage() {
  return (
    <Suspense
      fallback={
        <MobileShell
          title="Deal Check"
          subtitle="Quickly judge if a listing is worth buying."
          showBackButton
          backFallbackHref="/search"
        >
          <section className="rounded-2xl border border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
            Loading deal check...
          </section>
        </MobileShell>
      }
    >
      <DealCheckContent />
    </Suspense>
  );
}
