"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CardCollectionActions } from "@/components/card-collection-actions";
import { useCurrency } from "@/components/currency-provider";
import { MobileShell } from "@/components/mobile-shell";
import { getCardById, getDealCheck, searchCards } from "@/lib/cards/card-service";
import { Card, DealDataQuality, DealPriceSource, DealVerdict } from "@/lib/cards/types";

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

function getPriceSourceLabel(source: DealPriceSource) {
  switch (source) {
    case "tcgplayer-pokemon-tcg-api":
      return "TCGplayer via Pokemon TCG API";
    case "cardmarket-pokemon-tcg-api":
      return "Cardmarket via Pokemon TCG API";
    default:
      return "Mock fallback/demo";
  }
}

function getDataQualityLabel(dataQuality: DealDataQuality) {
  switch (dataQuality) {
    case "live-data":
      return "Live data";
    case "limited-data":
      return "Limited data";
    case "demo-fallback":
      return "Demo fallback";
    default:
      return "Price unavailable";
  }
}

function getDataQualityTone(dataQuality: DealDataQuality) {
  switch (dataQuality) {
    case "live-data":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    case "limited-data":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    case "demo-fallback":
      return "border-zinc-500/40 bg-zinc-500/10 text-zinc-200";
    default:
      return "border-rose-500/40 bg-rose-500/10 text-rose-200";
  }
}

function getSelectedCardDataQuality(card: Card | null): DealDataQuality {
  if (!card) {
    return "price-unavailable";
  }

  if (card.dataSource !== "pokemon-tcg-api") {
    return "demo-fallback";
  }

  if (card.marketValue === null || card.marketValue <= 0) {
    return "price-unavailable";
  }

  const hasTcgplayer = Boolean(card.tcgplayerPrices && Object.keys(card.tcgplayerPrices).length > 0);
  const hasCardmarket = Boolean(
    card.cardmarketPrices &&
      (card.cardmarketPrices.market !== undefined ||
        card.cardmarketPrices.mid !== undefined ||
        card.cardmarketPrices.low !== undefined)
  );

  return hasTcgplayer && hasCardmarket ? "live-data" : "limited-data";
}

function getSelectedCardPriceSources(card: Card | null): DealPriceSource[] {
  if (!card || card.dataSource !== "pokemon-tcg-api") {
    return card ? ["mock-fallback"] : [];
  }

  const sources: DealPriceSource[] = [];

  if (card.tcgplayerPrices && Object.keys(card.tcgplayerPrices).length > 0) {
    sources.push("tcgplayer-pokemon-tcg-api");
  }

  if (
    card.cardmarketPrices &&
    (card.cardmarketPrices.market !== undefined ||
      card.cardmarketPrices.mid !== undefined ||
      card.cardmarketPrices.low !== undefined)
  ) {
    sources.push("cardmarket-pokemon-tcg-api");
  }

  return sources;
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

  const askingPriceNumber = Number(askingPrice);
  const hasValidAskingPrice = Number.isFinite(askingPriceNumber) && askingPriceNumber > 0;
  const askingPriceUsd = hasValidAskingPrice ? convertToUsd(askingPriceNumber) : 0;
  const selectedCardDataQuality = getSelectedCardDataQuality(selectedCard);
  const selectedCardPriceSources = getSelectedCardPriceSources(selectedCard);
  const isLiveCard = selectedCard?.dataSource === "pokemon-tcg-api";
  const hasLiveMarketPrice = Boolean(selectedCard && selectedCard.marketValue !== null && selectedCard.marketValue > 0);
  const canAnalyze = Boolean(selectedCard && hasValidAskingPrice && isLiveCard && hasLiveMarketPrice);

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
            Strict trust mode only compares your asking price against live market pricing when real source data exists.
          </p>

          <div className="mt-3 rounded-xl border border-[#383a43] bg-black/20 px-3 py-3 text-xs text-zinc-300">
            <p>Not enough data for recent sold prices, trend, volatility, liquidity, demand, market pulse, or charts.</p>
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
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`rounded-full border px-2 py-0.5 ${getDataQualityTone(selectedCardDataQuality)}`}>
                      {getDataQualityLabel(selectedCardDataQuality)}
                    </span>
                    {selectedCard.marketValue !== null ? <span className="text-zinc-300">{formatUsd(selectedCard.marketValue)} market</span> : null}
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

          {!canAnalyze && selectedCard ? (
            <div className="mt-3 rounded-xl border border-dashed border-[#4a3e2a] bg-[#1a1610] px-3 py-3 text-xs text-amber-200">
              {selectedCard.dataSource !== "pokemon-tcg-api"
                ? "Demo fallback card selected. Real analysis is disabled until live card data is available."
                : selectedCard.marketValue === null || selectedCard.marketValue <= 0
                  ? "This card does not have enough live price data yet. Price unavailable."
                  : "Enter a valid asking price to analyze with live market data."}
            </div>
          ) : null}
        </article>

        {!showAnalysis ? (
          <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4 text-sm text-zinc-300">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Trust Mode</p>
            <p className="mt-2">Deal Check only runs verdict analysis for live cards with usable market prices.</p>
            <p className="mt-2 text-zinc-400">
              If a card is fallback/demo or missing live price fields, analysis is limited and unavailable metrics are shown clearly.
            </p>
          </article>
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
                <p className="text-zinc-400">Live Market Price</p>
                <p className="mt-1 text-lg font-semibold text-white">{formatUsd(dealCheck.marketPrice)}</p>
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
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">Data quality</p>
                <span className={`rounded-full border px-2.5 py-1 text-xs ${getDataQualityTone(dealCheck.dataQuality)}`}>
                  {getDataQualityLabel(dealCheck.dataQuality)}
                </span>
              </div>

              <div className="mt-3 space-y-2 text-sm text-zinc-200">
                <div className="rounded-lg border border-[#2c3038] bg-[#0f1218] px-3 py-2">
                  <p className="text-xs text-zinc-400">Price source</p>
                  <ul className="mt-1 space-y-1">
                    {dealCheck.priceSources.map((source) => (
                      <li key={source}>{getPriceSourceLabel(source)}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-[#2c3038] bg-[#0f1218] px-3 py-2">
                  <p className="text-xs text-zinc-400">Last updated</p>
                  <p className="mt-1">{dealCheck.lastUpdated ? dealCheck.lastUpdated : "Not enough data"}</p>
                </div>
                <div className="rounded-lg border border-[#2c3038] bg-[#0f1218] px-3 py-2">
                  <p className="text-xs text-zinc-400">Warnings</p>
                  <ul className="mt-1 space-y-1">
                    {dealCheck.missingDataWarnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-[#2c3038] bg-[#0f1218] px-3 py-2">
                  <p className="text-xs text-zinc-400">Unavailable metrics</p>
                  <ul className="mt-1 space-y-1">
                    {dealCheck.unavailableMetrics.map((metric) => (
                      <li key={metric}>{metric}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-lg border border-dashed border-[#4a3e2a] bg-[#1a1610] px-3 py-2 text-amber-200">
                  Trend unavailable. Connect more pricing data sources.
                </div>
                <div className="rounded-lg border border-dashed border-[#4a3e2a] bg-[#1a1610] px-3 py-2 text-amber-200">
                  Not enough data for sold-price history charts.
                </div>
                <div className="rounded-lg border border-dashed border-[#4a3e2a] bg-[#1a1610] px-3 py-2 text-amber-200">
                  {dealCheck.confidenceNote}
                </div>
              </div>
            </div>

            {selectedCardPriceSources.length > 0 ? (
              <div className="rounded-2xl border border-[#30343c] bg-[#12151c] p-4 text-sm">
                <p className="text-zinc-400">Selected card source coverage</p>
                <ul className="mt-2 space-y-1 text-zinc-200">
                  {selectedCardPriceSources.map((source) => (
                    <li key={`selected-${source}`}>{getPriceSourceLabel(source)}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[#4a3e2a] bg-[#1a1610] p-4 text-sm text-amber-200">
                Price unavailable. Connect more pricing data sources.
              </div>
            )}

            <CardCollectionActions cardId={selectedCard.id} />
            <Link
              href={`/cards/${selectedCard.id}`}
              className="inline-flex w-full items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-4 py-3 text-sm font-medium text-white"
            >
              Open Card Detail
            </Link>
          </article>
        ) : showAnalysis && hasValidAskingPrice && selectedCard && selectedCard.dataSource !== "pokemon-tcg-api" ? (
          <article className="rounded-2xl border border-dashed border-[#4a3e2a] bg-[#1a1610] p-4 text-sm text-amber-200">
            Demo fallback detected. This card is not from live provider data, so analysis is disabled.
          </article>
        ) : showAnalysis && hasValidAskingPrice && selectedCard && (selectedCard.marketValue === null || selectedCard.marketValue <= 0) ? (
          <article className="rounded-2xl border border-dashed border-[#4a3e2a] bg-[#1a1610] p-4 text-sm text-amber-200">
            This card does not have enough live price data yet. Price unavailable.
          </article>
        ) : !showAnalysis ? null : (
          <article className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
            Enter an asking price to run live price comparison.
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
