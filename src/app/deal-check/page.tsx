"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCurrency } from "@/components/currency-provider";
import { MobileShell } from "@/components/mobile-shell";
import { getCardById, getCardsBySet, getDealCheck, getSets, searchCards } from "@/lib/cards/card-service";
import {
  type InvestmentCheckResponse,
  type InvestmentListing,
  type InvestmentPricePoint,
  type InvestmentPriceRange,
  type InvestmentRecentSale,
} from "@/lib/cards/investment-check";
import { Card, CardSet, DealCheckResult, DealDataQuality, DealPriceSource, DealVerdict } from "@/lib/cards/types";
import { getInvestmentCheckApiRuntimeInfo, getInvestmentCheckApiUrl } from "@/lib/investment-api-url";

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_RESULT_LIMIT = 10;
const INVESTMENT_SEARCH_PAGE_SIZE = 50;
const SET_CARD_LIMIT = 80;
const SHOW_INVESTMENT_DEBUG =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_INVESTMENT_DEBUG === "true";

type DealCheckMode = "deal-analyzer" | "investment-check";

type InvestmentDebugInfo = {
  activeListings?: number;
  error?: string | null;
  fairValueUsd?: number | null;
  priceHistoryPoints?: number;
  recentSales?: number;
  status?: number;
  url: string | null;
};

function getCardImage(card: Card) {
  return card.imageSmall ?? card.image;
}

function isRemoteImage(value: string | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function normalize(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getRankedCards(cards: Card[], query: string) {
  const q = normalize(query);
  const queryTokens = q.split(/\s+/).filter(Boolean);

  return [...cards]
    .filter((card) => {
      if (!q) {
        return true;
      }

      const haystack = [card.name, card.set, card.number, card.rarity, card.type].join(" ").toLowerCase();

      return haystack.includes(q) || queryTokens.every((token) => haystack.includes(token));
    })
    .sort((a, b) => {
      const aName = normalize(a.name);
      const bName = normalize(b.name);

      if (q) {
        const aStarts = aName.startsWith(q);
        const bStarts = bName.startsWith(q);

        if (aStarts !== bStarts) {
          return aStarts ? -1 : 1;
        }
      }

      const aHasPrice = a.marketValue !== null && a.marketValue > 0;
      const bHasPrice = b.marketValue !== null && b.marketValue > 0;

      if (aHasPrice !== bHasPrice) {
        return aHasPrice ? -1 : 1;
      }

      return aName.localeCompare(bName);
    });
}

function getVerdictTone(verdict: DealVerdict) {
  switch (verdict) {
    case "STRONG BUY":
      return {
        card: "border-emerald-400/50 bg-emerald-400/12",
        text: "text-emerald-300",
        pill: "border-emerald-400/50 bg-emerald-400/15 text-emerald-200",
      };
    case "GOOD DEAL":
      return {
        card: "border-lime-400/40 bg-lime-400/10",
        text: "text-lime-300",
        pill: "border-lime-400/40 bg-lime-400/15 text-lime-200",
      };
    case "FAIR PRICE":
      return {
        card: "border-sky-400/40 bg-sky-400/10",
        text: "text-sky-300",
        pill: "border-sky-400/40 bg-sky-400/15 text-sky-200",
      };
    case "OVERPRICED":
      return {
        card: "border-amber-400/40 bg-amber-400/10",
        text: "text-amber-300",
        pill: "border-amber-400/40 bg-amber-400/15 text-amber-200",
      };
    default:
      return {
        card: "border-rose-400/45 bg-rose-400/10",
        text: "text-rose-300",
        pill: "border-rose-400/45 bg-rose-400/15 text-rose-200",
      };
  }
}

function getDataQualityText(dataQuality: DealDataQuality) {
  switch (dataQuality) {
    case "live-data":
      return "Live market data";
    case "limited-data":
      return "Limited pricing data";
    case "demo-fallback":
      return "Demo data only";
    default:
      return "Price unavailable";
  }
}

function getPriceSourceLabel(source: DealPriceSource) {
  switch (source) {
    case "tcgplayer-pokemon-tcg-api":
      return "TCGplayer via Pokemon TCG API";
    case "cardmarket-pokemon-tcg-api":
      return "Cardmarket via Pokemon TCG API";
    default:
      return "Demo fallback";
  }
}

function getSelectedCardDataQuality(card: Card | null): DealDataQuality {
  if (!card || card.marketValue === null || card.marketValue <= 0) {
    return "price-unavailable";
  }

  if (card.dataSource !== "pokemon-tcg-api") {
    return "demo-fallback";
  }

  const sourceCount = [
    card.tcgplayerPrices && Object.keys(card.tcgplayerPrices).length > 0,
    card.cardmarketPrices &&
      (card.cardmarketPrices.market !== undefined ||
        card.cardmarketPrices.mid !== undefined ||
        card.cardmarketPrices.low !== undefined),
  ].filter(Boolean).length;

  return sourceCount >= 2 ? "live-data" : "limited-data";
}

function CardThumb({ card, className }: { card: Card; className: string }) {
  const image = getCardImage(card);

  if (isRemoteImage(image)) {
    return <img src={image} alt={card.name} loading="lazy" decoding="async" className={className} />;
  }

  return (
    <div className={`${className} flex items-center justify-center bg-[#101318] text-xs font-semibold text-zinc-500`}>
      No image
    </div>
  );
}

function CardSelectButton({
  card,
  selected,
  onSelect,
}: {
  card: Card;
  selected: boolean;
  onSelect: () => void;
}) {
  const { formatUsd } = useCurrency();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-2xl border p-2.5 text-left transition active:scale-[0.99] ${
        selected ? "border-[#7dd3fc]/60 bg-[#122033]" : "border-[#252b34] bg-[#101318]"
      }`}
    >
      <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl border border-[#303640] bg-[#0c0f14]">
        <CardThumb card={card} className="h-full w-full object-contain p-1" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-sm font-semibold text-white">{card.name}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
          {card.set} #{card.number}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="truncate text-xs font-semibold text-[#e1b54f]">
            {card.marketValue !== null && card.marketValue > 0 ? formatUsd(card.marketValue) : "Price unavailable"}
          </p>
          {selected ? <span className="text-xs font-semibold text-[#7dd3fc]">Selected</span> : null}
        </div>
      </div>
    </button>
  );
}

function StepHeader({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#29313c] bg-[#111722] text-xs font-semibold text-[#7dd3fc]">
        {step}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-0.5 text-xs leading-5 text-zinc-500">{body}</p>
      </div>
    </div>
  );
}

function ProBadge() {
  return (
    <span className="rounded-full border border-[#e1b54f]/45 bg-[#e1b54f]/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#e1b54f]">
      Pro
    </span>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function PriceHistoryChart({ history }: { history: InvestmentPricePoint[] }) {
  const { formatUsd } = useCurrency();
  const cleanHistory = history.filter((point) => Number.isFinite(point.valueUsd) && point.valueUsd > 0);

  if (cleanHistory.length < 2) {
    return (
      <div className="rounded-xl border border-white/10 bg-black/15 p-4">
        <p className="text-xs text-zinc-400">Price history</p>
        <div className="mt-3 flex h-40 items-center justify-center rounded-xl border border-dashed border-[#3a3322] bg-[#0f0d08] text-sm text-amber-100/80">
          Not enough price history yet.
        </div>
      </div>
    );
  }

  const values = cleanHistory.map((point) => point.valueUsd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartPoints = cleanHistory.map((point, index) => {
    const x = cleanHistory.length === 1 ? 0 : (index / (cleanHistory.length - 1)) * 100;
    const y = 100 - ((point.valueUsd - min) / range) * 82 - 9;

    return { x, y };
  });
  const points = chartPoints.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
  const areaPath = [
    "M 0 100",
    ...chartPoints.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
    "L 100 100 Z",
  ].join(" ");
  const first = cleanHistory[0];
  const last = cleanHistory[cleanHistory.length - 1];

  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-zinc-400">Price history</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {formatUsd(first.valueUsd)} to {formatUsd(last.valueUsd)}
          </p>
        </div>
        <p className="text-right text-xs text-zinc-500">
          {formatShortDate(first.date)} - {formatShortDate(last.date)}
        </p>
      </div>
      <div className="mt-4 h-40">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="investmentChartFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#e1b54f" stopOpacity="0.26" />
              <stop offset="100%" stopColor="#e1b54f" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#investmentChartFill)" opacity="0.9" />
          <polyline points={points} fill="none" stroke="#e1b54f" strokeWidth="2.6" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
        <span>{formatShortDate(first.date)}</span>
        <span>{formatShortDate(last.date)}</span>
      </div>
    </div>
  );
}

function PriceRangeSummary({ title, range }: { title: string; range: InvestmentPriceRange | null }) {
  const { formatUsd } = useCurrency();

  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-3">
      <p className="text-xs text-zinc-400">{title}</p>
      {range ? (
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-zinc-500">Low</p>
            <p className="mt-1 font-semibold text-white">{range.lowUsd ? formatUsd(range.lowUsd) : "-"}</p>
          </div>
          <div>
            <p className="text-zinc-500">Avg</p>
            <p className="mt-1 font-semibold text-white">{range.averageUsd ? formatUsd(range.averageUsd) : "-"}</p>
          </div>
          <div>
            <p className="text-zinc-500">High</p>
            <p className="mt-1 font-semibold text-white">{range.highUsd ? formatUsd(range.highUsd) : "-"}</p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-300">Not enough market range yet.</p>
      )}
    </div>
  );
}

function RecentSalesList({ sales }: { sales: InvestmentRecentSale[] }) {
  const { formatUsd } = useCurrency();

  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-3">
      <p className="text-xs text-zinc-400">Recent sold comps</p>
      {sales.length > 0 ? (
        <div className="mt-2 space-y-2">
          {sales.slice(0, 5).map((sale, index) => (
            <div key={`${sale.date ?? "sale"}-${sale.priceUsd}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate text-zinc-100">{sale.title || sale.condition || "Sold comp"}</p>
                <p className="text-xs text-zinc-500">{sale.date ? formatShortDate(sale.date) : "Recent"}</p>
              </div>
              <p className="shrink-0 font-semibold text-white">{formatUsd(sale.priceUsd)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-300">No recent sold comps are available yet.</p>
      )}
    </div>
  );
}

function ActiveListingsList({ listings }: { listings: InvestmentListing[] }) {
  const { formatUsd } = useCurrency();

  return (
    <div className="rounded-xl border border-white/10 bg-black/15 p-3">
      <p className="text-xs text-zinc-400">Active listings</p>
      {listings.length > 0 ? (
        <div className="mt-2 space-y-2">
          {listings.slice(0, 5).map((listing, index) => (
            <div key={`${listing.title ?? "listing"}-${listing.priceUsd}-${index}`} className="flex items-center justify-between gap-3 text-sm">
              <p className="min-w-0 truncate text-zinc-100">{listing.title || listing.condition || "Listing"}</p>
              <p className="shrink-0 font-semibold text-white">{formatUsd(listing.priceUsd)}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-zinc-300">No active listing prices are available yet.</p>
      )}
    </div>
  );
}

function ModeTabs({
  activeMode,
  onModeChange,
}: {
  activeMode: DealCheckMode;
  onModeChange: (mode: DealCheckMode) => void;
}) {
  const modes: { value: DealCheckMode; label: string; body: string; isPro?: boolean }[] = [
    {
      value: "deal-analyzer",
      label: "Deal Analyzer",
      body: "Compare seller price to market.",
    },
    {
      value: "investment-check",
      label: "Investment Check",
      body: "Assess trends, demand, and risk.",
      isPro: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#242b35] bg-[#0d0f13] p-2">
      {modes.map((mode) => {
        const isActive = activeMode === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            onClick={() => onModeChange(mode.value)}
            className={`rounded-xl border p-3 text-left transition active:scale-[0.99] ${
              isActive ? "border-[#7dd3fc]/55 bg-[#122033]" : "border-transparent bg-[#101318] text-zinc-500"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-zinc-300"}`}>{mode.label}</span>
              {mode.isPro ? <ProBadge /> : null}
            </span>
            <span className={`mt-1 block text-[11px] leading-4 ${isActive ? "text-zinc-400" : "text-zinc-600"}`}>
              {mode.body}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DealResult({
  result,
  selectedCard,
  sellerPrice,
}: {
  result: DealCheckResult | undefined;
  selectedCard: Card | null;
  sellerPrice: number;
}) {
  const { formatUsd } = useCurrency();

  if (!selectedCard) {
    return null;
  }

  if (!result) {
    return (
      <article className="rounded-2xl border border-amber-400/30 bg-[#17140d] p-4">
        <p className="text-sm font-semibold text-amber-200">Pricing data is limited</p>
        <p className="mt-2 text-sm leading-6 text-amber-100/90">
          Pricing data is limited for this card, so treat this as a guide only. Try another printing, check recent sold
          listings, and compare condition before buying.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl border border-amber-400/20 bg-black/15 p-3">
            <p className="text-xs text-amber-200/70">Seller price</p>
            <p className="mt-1 font-semibold text-white">{formatUsd(sellerPrice)}</p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-black/15 p-3">
            <p className="text-xs text-amber-200/70">Market price</p>
            <p className="mt-1 font-semibold text-white">Unavailable</p>
          </div>
        </div>
      </article>
    );
  }

  const tone = getVerdictTone(result.verdict);
  const differenceAmount = result.askingPrice - result.marketPrice;
  const isBuyerFriendly = differenceAmount <= 0;

  return (
    <article className={`space-y-4 rounded-2xl border p-4 ${tone.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-zinc-400">Deal signal</p>
          <h2 className={`mt-1 text-3xl font-semibold tracking-tight ${tone.text}`}>{result.verdict}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${tone.pill}`}>
          {getDataQualityText(result.dataQuality)}
        </span>
      </div>

      <p className="text-sm leading-6 text-zinc-100">{result.explanation}</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <p className="text-xs text-zinc-400">Market price</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatUsd(result.marketPrice)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <p className="text-xs text-zinc-400">Seller price</p>
          <p className="mt-1 text-lg font-semibold text-white">{formatUsd(result.askingPrice)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <p className="text-xs text-zinc-400">Difference</p>
          <p className={`mt-1 text-base font-semibold ${isBuyerFriendly ? "text-emerald-300" : "text-rose-300"}`}>
            {differenceAmount > 0 ? "+" : ""}
            {formatUsd(differenceAmount)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <p className="text-xs text-zinc-400">Difference %</p>
          <p className={`mt-1 text-base font-semibold ${isBuyerFriendly ? "text-emerald-300" : "text-rose-300"}`}>
            {formatSignedPercent(result.differencePercent)}
          </p>
        </div>
      </div>

      {result.dataQuality !== "live-data" ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm leading-6 text-amber-100">
          Pricing data is limited for this card, so treat this as a guide only.
        </div>
      ) : null}

      <div className="rounded-xl border border-white/10 bg-black/15 p-3 text-xs leading-5 text-zinc-400">
        <p className="font-semibold text-zinc-300">Data used</p>
        <p className="mt-1">{result.priceSources.map(getPriceSourceLabel).join(", ")}</p>
        <p className="mt-1">{result.confidenceNote}</p>
      </div>

      <Link
        href={`/detail?type=card&id=${selectedCard.id}`}
        className="inline-flex w-full items-center justify-center rounded-xl border border-[#303844] bg-[#111722] px-4 py-3 text-sm font-semibold text-[#7dd3fc]"
      >
        Open card details
      </Link>
    </article>
  );
}

function InvestmentCheckMode() {
  const { formatUsd, selectedCurrencyCode } = useCurrency();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMoreSearchResults, setHasMoreSearchResults] = useState(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const [investmentResult, setInvestmentResult] = useState<InvestmentCheckResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMoreResults, setIsLoadingMoreResults] = useState(false);
  const [isAnalyzingInvestment, setIsAnalyzingInvestment] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [investmentDebugInfo, setInvestmentDebugInfo] = useState<InvestmentDebugInfo | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const loadSearchResults = async () => {
      const trimmedQuery = debouncedQuery.trim();

      if (!trimmedQuery) {
        setSearchResults([]);
        setSearchPage(1);
        setHasMoreSearchResults(false);
        setSearchError(null);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        setSearchError(null);
        const cards = await searchCards(trimmedQuery, { page: 1, pageSize: INVESTMENT_SEARCH_PAGE_SIZE });

        if (!cancelled) {
          setSearchResults(cards);
          setSearchPage(1);
          setHasMoreSearchResults(cards.length === INVESTMENT_SEARCH_PAGE_SIZE);
        }
      } catch {
        if (!cancelled) {
          setSearchError("Investment card search is unavailable right now.");
          setSearchResults([]);
          setSearchPage(1);
          setHasMoreSearchResults(false);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };

    loadSearchResults();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const visibleSearchResults = useMemo(() => {
    return query.trim() ? getRankedCards(searchResults, query) : [];
  }, [searchResults, query]);

  const loadMoreSearchResults = async () => {
    const trimmedQuery = debouncedQuery.trim();

    if (!trimmedQuery || isLoadingMoreResults || !hasMoreSearchResults) {
      return;
    }

    try {
      setIsLoadingMoreResults(true);
      setSearchError(null);
      const nextPage = searchPage + 1;
      const cards = await searchCards(trimmedQuery, { page: nextPage, pageSize: INVESTMENT_SEARCH_PAGE_SIZE });
      const seenCardIds = new Set(searchResults.map((card) => card.id));
      const nextCards = cards.filter((card) => !seenCardIds.has(card.id));

      setSearchResults((currentCards) => [...currentCards, ...nextCards]);
      setSearchPage(nextPage);
      setHasMoreSearchResults(cards.length === INVESTMENT_SEARCH_PAGE_SIZE);
    } catch {
      setSearchError("More card results could not be loaded right now.");
    } finally {
      setIsLoadingMoreResults(false);
    }
  };

  const selectCard = (card: Card) => {
    setSelectedCard(card);
    setQuery(`${card.name} ${card.number}`.trim());
    setInvestmentResult(null);
    setAnalysisError(null);
  };

  const purchasePriceNumber = Number(purchasePrice);
  const hasPurchasePrice = Number.isFinite(purchasePriceNumber) && purchasePriceNumber > 0;

  const handleAnalyzeInvestment = async () => {
    if (!selectedCard || !hasPurchasePrice) {
      return;
    }

    let investmentApiUrl: string | null = null;

    try {
      setIsAnalyzingInvestment(true);
      setAnalysisError(null);
      investmentApiUrl = getInvestmentCheckApiUrl();
      setInvestmentDebugInfo({
        error: null,
        url: investmentApiUrl,
      });

      console.info("[InvestmentCheck] request", {
        url: investmentApiUrl ?? null,
        ...getInvestmentCheckApiRuntimeInfo(),
        card: {
          id: selectedCard.id,
          name: selectedCard.name,
          set: selectedCard.set,
          setId: selectedCard.setId ?? null,
          number: selectedCard.number,
          rarity: selectedCard.rarity,
        },
      });

      if (!investmentApiUrl) {
        setInvestmentDebugInfo({
          error: "API URL is not configured for this build.",
          url: null,
        });
        throw new Error("Investment Check API URL is not configured for this app build.");
      }

      const response = await fetch(investmentApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cardId: selectedCard.id,
          purchasePrice: purchasePriceNumber,
          currencyCode: selectedCurrencyCode,
        }),
      });

      console.info("[InvestmentCheck] response", {
        url: investmentApiUrl,
        ok: response.ok,
        status: response.status,
      });
      setInvestmentDebugInfo((current) => ({
        ...(current ?? { url: investmentApiUrl }),
        status: response.status,
      }));

      if (!response.ok) {
        throw new Error(`Investment analysis failed with ${response.status}.`);
      }

      const result = (await response.json()) as InvestmentCheckResponse;

      console.info("[InvestmentCheck] response data", {
        fairValueUsd: result.fairValueUsd,
        priceHistoryPoints: result.priceHistory.length,
        activeListings: result.activeListings.length,
        recentSales: result.recentSales.length,
        dataQuality: result.dataQuality,
      });
      setInvestmentDebugInfo({
        activeListings: result.activeListings.length,
        error: null,
        fairValueUsd: result.fairValueUsd,
        priceHistoryPoints: result.priceHistory.length,
        recentSales: result.recentSales.length,
        status: response.status,
        url: investmentApiUrl,
      });

      setInvestmentResult(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown investment check error";
      console.info("[InvestmentCheck] request failed", {
        message,
      });
      setInvestmentDebugInfo((current) => ({
        ...(current ?? { url: investmentApiUrl }),
        error: message,
      }));
      setInvestmentResult(null);
      setAnalysisError("Market data could not be reached. Please check connection and try again.");
    } finally {
      setIsAnalyzingInvestment(false);
    }
  };

  return (
    <section className="space-y-5">
      <article className="rounded-2xl border border-[#242b35] bg-[#0d0f13] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-[#e1b54f]">Investment Check</p>
          <ProBadge />
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Decide if a card is worth buying now.</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Built for purchase timing, downside risk, and longer-term confidence instead of only price comparison.
        </p>
      </article>

      <article className="space-y-4 rounded-2xl border border-[#242b35] bg-[#0d0f13] p-4">
        <StepHeader step="1" title="Choose card" body="Search for the exact card you are thinking about buying." />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search Pokemon cards"
          className="w-full rounded-xl border border-[#262a31] bg-[#0f1012] px-3 py-3 text-sm text-white outline-none ring-[#7dd3fc] placeholder:text-zinc-500 focus:ring-2"
        />

        {searchError ? (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{searchError}</div>
        ) : null}

        {isSearching ? (
          <div className="grid gap-2">
            {[0, 1].map((item) => (
              <div key={item} className="h-[102px] animate-pulse rounded-2xl bg-[#11141a]" />
            ))}
          </div>
        ) : visibleSearchResults.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
              <span>{visibleSearchResults.length} results loaded</span>
              {hasMoreSearchResults ? <span>More available</span> : null}
            </div>
            {visibleSearchResults.map((card) => (
              <CardSelectButton
                key={card.id}
                card={card}
                selected={selectedCard?.id === card.id}
                onSelect={() => selectCard(card)}
              />
            ))}
            {hasMoreSearchResults ? (
              <button
                type="button"
                onClick={loadMoreSearchResults}
                disabled={isLoadingMoreResults}
                className="w-full rounded-xl border border-[#303640] bg-[#111722] px-4 py-3 text-sm font-semibold text-[#7dd3fc] disabled:text-zinc-500"
              >
                {isLoadingMoreResults ? "Loading more..." : "Load more results"}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#303640] bg-[#101318] p-3 text-sm text-zinc-400">
            Search for a card to prepare the investment check.
          </div>
        )}
      </article>

      <article className="space-y-4 rounded-2xl border border-[#242b35] bg-[#0d0f13] p-4">
        <StepHeader step="2" title="Purchase price" body="Enter the price you would pay so the future signal can include risk and upside." />
        <label className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Purchase price ({selectedCurrencyCode})</label>
        <input
          value={purchasePrice}
          onChange={(event) => {
            setPurchasePrice(event.target.value);
            setInvestmentResult(null);
            setAnalysisError(null);
          }}
          inputMode="decimal"
          placeholder="Enter purchase price"
          className="w-full rounded-xl border border-[#262a31] bg-[#0f1012] px-3 py-3 text-sm text-white outline-none ring-[#7dd3fc] placeholder:text-zinc-500 focus:ring-2"
        />
        <button
          type="button"
          onClick={handleAnalyzeInvestment}
          disabled={!selectedCard || !hasPurchasePrice || isAnalyzingInvestment}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
            selectedCard && hasPurchasePrice && !isAnalyzingInvestment
              ? "border-[#e1b54f]/45 bg-[#e1b54f]/12 text-[#e1b54f] shadow-[0_10px_28px_rgba(225,181,79,0.12)]"
              : "border-[#303640] bg-[#11141a] text-zinc-500"
          }`}
        >
          {isAnalyzingInvestment ? "Analyzing..." : "Analyze Investment"}
          <ProBadge />
        </button>
        {!selectedCard || !hasPurchasePrice ? (
          <p className="text-sm text-zinc-500">Select a card and enter a purchase price to run Investment Check.</p>
        ) : null}
        {analysisError ? (
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{analysisError}</div>
        ) : null}
        {SHOW_INVESTMENT_DEBUG && investmentDebugInfo ? (
          <div className="space-y-1 rounded-xl border border-[#303640] bg-[#101318] p-3 text-xs leading-5 text-zinc-400">
            <p className="font-semibold text-zinc-300">Investment API debug</p>
            <p>URL: {investmentDebugInfo.url ?? "Not configured"}</p>
            <p>Status: {investmentDebugInfo.status ?? "Not reached"}</p>
            {investmentDebugInfo.error ? <p>Error: {investmentDebugInfo.error}</p> : null}
            {typeof investmentDebugInfo.fairValueUsd === "number" ? <p>Fair value: ${investmentDebugInfo.fairValueUsd.toFixed(2)}</p> : null}
            {typeof investmentDebugInfo.priceHistoryPoints === "number" ? <p>History points: {investmentDebugInfo.priceHistoryPoints}</p> : null}
            {typeof investmentDebugInfo.activeListings === "number" ? <p>Listings/variants: {investmentDebugInfo.activeListings}</p> : null}
            {typeof investmentDebugInfo.recentSales === "number" ? <p>Sold comps: {investmentDebugInfo.recentSales}</p> : null}
          </div>
        ) : null}
      </article>

      {investmentResult ? (
        <article className="space-y-4 rounded-2xl border border-[#e1b54f]/35 bg-[#17140d] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-[#e1b54f]/80">Investment signal</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-white">{investmentResult.signal}</h2>
            </div>
            <span className="rounded-full border border-[#e1b54f]/40 bg-[#e1b54f]/10 px-3 py-1 text-xs font-semibold text-[#e1b54f]">
              {investmentResult.score}/100
            </span>
          </div>

          <p className="text-sm leading-6 text-amber-100/90">{investmentResult.finalExplanation}</p>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-amber-400/20 bg-black/15 p-3">
              <p className="text-xs text-amber-200/70">Purchase price</p>
              <p className="mt-1 font-semibold text-white">{formatUsd(investmentResult.purchasePriceUsd)}</p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-black/15 p-3">
              <p className="text-xs text-amber-200/70">Fair value</p>
              <p className="mt-1 font-semibold text-white">
                {investmentResult.fairValueUsd ? formatUsd(investmentResult.fairValueUsd) : "Limited data"}
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-black/15 p-3">
              <p className="text-xs text-amber-200/70">Demand score</p>
              <p className="mt-1 font-semibold text-white">{investmentResult.demandScore}/100</p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-black/15 p-3">
              <p className="text-xs text-amber-200/70">Confidence</p>
              <p className="mt-1 font-semibold text-white">{investmentResult.confidence}%</p>
            </div>
          </div>

          <PriceHistoryChart history={investmentResult.priceHistory} />

          <div className="grid gap-2 text-sm">
            <div className="rounded-xl border border-white/10 bg-black/15 p-3">
              <p className="text-xs text-zinc-400">Price direction</p>
              <p className="mt-1 text-zinc-100">{investmentResult.trendSummary}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/15 p-3">
              <p className="text-xs text-zinc-400">Market stability</p>
              <p className="mt-1 text-zinc-100">{investmentResult.marketStability}</p>
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            {investmentResult.soldRange ? <PriceRangeSummary title="Sold price range" range={investmentResult.soldRange} /> : null}
            <RecentSalesList sales={investmentResult.recentSales} />
            <PriceRangeSummary title="Listing price range" range={investmentResult.listingRange} />
            <ActiveListingsList listings={investmentResult.activeListings} />
          </div>

          {investmentResult.riskNotes.length > 0 ? (
            <div className="rounded-xl border border-amber-400/20 bg-black/15 p-3 text-sm leading-6 text-amber-100/90">
              <p className="font-semibold text-white">Risk notes</p>
              <ul className="mt-1 space-y-1">
                {investmentResult.riskNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-xl border border-white/10 bg-black/15 p-3 text-xs leading-5 text-zinc-400">
            <p className="font-semibold text-zinc-300">Data used</p>
            <p className="mt-1">{investmentResult.sources.join(", ")}</p>
            <p className="mt-1">Signals improve as more price history, sold comps, and listing data become available.</p>
          </div>
        </article>
      ) : (
        <article className="space-y-4 rounded-2xl border border-[#e1b54f]/35 bg-[#17140d] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[#e1b54f]/80">Pro feature</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Investment intelligence preview</h2>
          </div>
          <ProBadge />
        </div>
        <p className="text-sm leading-6 text-amber-100/90">
          Investment Check is a Pro feature. It will analyze trends, recent sales, demand, and risk to help you decide if a card is worth buying.
        </p>
        <div className="grid gap-2 text-sm">
          {[
            ["Investment signal", "Buy Now / Watch / Risky / Avoid"],
            ["Price history", "Market movement over time"],
            ["Market comps", "Sold prices and active listings"],
            ["Market stability", "Volatility and confidence"],
            ["Demand score", "Collector demand strength"],
            ["Risk notes", "Condition, liquidity, and pricing risks"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-amber-400/20 bg-black/15 p-3">
              <p className="text-xs text-amber-200/70">{label}</p>
              <p className="mt-1 font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/15 p-3 text-sm leading-6 text-zinc-300">
          <p className="font-semibold text-white">Final explanation</p>
          <p className="mt-1">
            Once Pro investment data is connected, this will explain in plain English whether the selected card looks attractive at your purchase price.
          </p>
        </div>
        </article>
      )}
    </section>
  );
}

function DealCheckContent() {
  const { formatUsd, selectedCurrencyCode, convertToUsd } = useCurrency();
  const searchParams = useSearchParams();
  const initialCardId = searchParams.get("cardId");
  const [activeMode, setActiveMode] = useState<DealCheckMode>("deal-analyzer");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Card[]>([]);
  const [sets, setSets] = useState<CardSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<CardSet | null>(null);
  const [setCards, setSetCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [sellerPrice, setSellerPrice] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSets, setIsLoadingSets] = useState(false);
  const [isLoadingSetCards, setIsLoadingSetCards] = useState(false);
  const [isSetSheetOpen, setIsSetSheetOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    const loadInitialCard = async () => {
      if (!initialCardId) {
        return;
      }

      const card = await getCardById(initialCardId);

      if (!cancelled && card) {
        setSelectedCard(card);
        setQuery(card.name);
      }
    };

    loadInitialCard();

    return () => {
      cancelled = true;
    };
  }, [initialCardId]);

  useEffect(() => {
    let cancelled = false;

    const loadSearchResults = async () => {
      try {
        setIsSearching(true);
        setSearchError(null);
        const cards = await searchCards(debouncedQuery);

        if (!cancelled) {
          setSearchResults(cards);
        }
      } catch {
        if (!cancelled) {
          setSearchError("Card search is unavailable right now.");
          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    };

    loadSearchResults();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    let cancelled = false;

    const loadSets = async () => {
      try {
        setIsLoadingSets(true);
        const nextSets = await getSets({ page: 1, pageSize: 40 });

        if (!cancelled) {
          setSets(nextSets);
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

  const visibleSearchResults = useMemo(() => {
    return getRankedCards(searchResults, query).slice(0, SEARCH_RESULT_LIMIT);
  }, [searchResults, query]);

  const sellerPriceNumber = Number(sellerPrice);
  const hasSellerPrice = Number.isFinite(sellerPriceNumber) && sellerPriceNumber > 0;
  const sellerPriceUsd = hasSellerPrice ? convertToUsd(sellerPriceNumber) : 0;
  const dealResult = selectedCard && hasSellerPrice ? getDealCheck(selectedCard.id, sellerPriceUsd) : undefined;
  const selectedDataQuality = getSelectedCardDataQuality(selectedCard);

  useEffect(() => {
    if (!isSetSheetOpen) {
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isSetSheetOpen]);

  const selectCard = (card: Card) => {
    setSelectedCard(card);
    setQuery(card.name);
    setIsSetSheetOpen(false);
    setShowResult(false);
  };

  const loadSetCards = async (set: CardSet) => {
    setSelectedSet(set);
    setIsLoadingSetCards(true);

    try {
      const cards = await getCardsBySet(set.id, { page: 1, pageSize: SET_CARD_LIMIT });
      setSetCards(cards);
    } finally {
      setIsLoadingSetCards(false);
    }
  };

  const handleAnalyze = () => {
    if (!selectedCard || !hasSellerPrice) {
      return;
    }

    setShowResult(true);
  };

  return (
    <MobileShell title="Deal Check" subtitle="Check a price before you buy." showBackButton backFallbackHref="/search">
      <section className="space-y-5">
        <ModeTabs activeMode={activeMode} onModeChange={setActiveMode} />

        {activeMode === "deal-analyzer" ? (
          <>
        <article className="rounded-2xl border border-[#242b35] bg-[#0d0f13] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Check if a card is worth buying before you pay.</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Pick the exact card, enter the seller price, and CollectIQ compares it with available market pricing.
          </p>
        </article>

        <article className="space-y-4 rounded-2xl border border-[#242b35] bg-[#0d0f13] p-4">
          <StepHeader step="1" title="Select card" body="Search directly or browse a set to pick the exact printing." />

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Pokemon cards"
              className="min-w-0 rounded-xl border border-[#262a31] bg-[#0f1012] px-3 py-3 text-sm text-white outline-none ring-[#7dd3fc] placeholder:text-zinc-500 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setIsSetSheetOpen(true)}
              className="rounded-xl border border-[#28303b] bg-[#111722] px-3 py-3 text-xs font-semibold text-[#7dd3fc]"
            >
              Sets
            </button>
          </div>

          {searchError ? (
            <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{searchError}</div>
          ) : null}

          {isSearching ? (
            <div className="grid gap-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-[102px] animate-pulse rounded-2xl bg-[#11141a]" />
              ))}
            </div>
          ) : visibleSearchResults.length > 0 ? (
            <div className="space-y-2">
              {visibleSearchResults.map((card) => (
                <CardSelectButton
                  key={card.id}
                  card={card}
                  selected={selectedCard?.id === card.id}
                  onSelect={() => selectCard(card)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#303640] bg-[#101318] p-3 text-sm text-zinc-400">
              No cards found yet. Try a broader name or browse by set.
            </div>
          )}

          {selectedCard ? (
            <div className="rounded-2xl border border-[#303844] bg-[#111722] p-3">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Selected</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-[#303640] bg-[#0c0f14]">
                  <CardThumb card={selectedCard} className="h-full w-full object-contain p-1" />
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-1 text-base font-semibold text-white">{selectedCard.name}</p>
                  <p className="mt-1 line-clamp-1 text-sm text-zinc-400">
                    {selectedCard.set} #{selectedCard.number}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#e1b54f]">
                    {selectedCard.marketValue !== null && selectedCard.marketValue > 0
                      ? formatUsd(selectedCard.marketValue)
                      : "Market price unavailable"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{getDataQualityText(selectedDataQuality)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </article>

        <article className="space-y-4 rounded-2xl border border-[#242b35] bg-[#0d0f13] p-4">
          <StepHeader step="2" title="Enter seller price" body="Use the price you are about to pay, before shipping or fees if you want a simple check." />
          <label className="block text-xs uppercase tracking-[0.14em] text-zinc-500">Seller price ({selectedCurrencyCode})</label>
          <input
            value={sellerPrice}
            onChange={(event) => {
              setSellerPrice(event.target.value);
              setShowResult(false);
            }}
            inputMode="decimal"
            placeholder="Enter seller price"
            className="w-full rounded-xl border border-[#262a31] bg-[#0f1012] px-3 py-3 text-sm text-white outline-none ring-[#7dd3fc] placeholder:text-zinc-500 focus:ring-2"
          />
        </article>

        <article className="space-y-4 rounded-2xl border border-[#242b35] bg-[#0d0f13] p-4">
          <StepHeader step="3" title="Analyze deal" body="Get a simple buy signal based on the seller price versus available market price." />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!selectedCard || !hasSellerPrice}
            className={`w-full rounded-xl border px-4 py-3 text-sm font-semibold transition ${
              selectedCard && hasSellerPrice
                ? "border-[#7dd3fc]/50 bg-[#112033] text-[#7dd3fc] shadow-[0_10px_28px_rgba(125,211,252,0.12)]"
                : "border-[#303640] bg-[#11141a] text-zinc-500"
            }`}
          >
            Analyze Deal
          </button>

          {!selectedCard || !hasSellerPrice ? (
            <p className="text-sm text-zinc-500">Select a card and enter a seller price to run the check.</p>
          ) : null}
        </article>

        {showResult ? (
          <DealResult result={dealResult} selectedCard={selectedCard} sellerPrice={sellerPriceUsd} />
        ) : null}
          </>
        ) : (
          <InvestmentCheckMode />
        )}
      </section>

      {isSetSheetOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" role="presentation">
          <button
            type="button"
            aria-label="Close set browser"
            className="absolute inset-0 h-full w-full"
            onClick={() => setIsSetSheetOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Browse sets"
            className="relative max-h-[85vh] w-full max-w-md overflow-hidden rounded-t-[28px] border border-[#262b34] bg-[#0d0f13] px-4 pt-3 shadow-[0_-20px_60px_rgba(0,0,0,0.55)]"
            style={{ paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))" }}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-[#343a44]" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">Browse sets</p>
                <p className="mt-0.5 text-xs text-zinc-500">Pick a set, then select the exact card.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSetSheetOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#2b3038] bg-[#13161c] text-zinc-300"
                aria-label="Close set browser"
              >
                x
              </button>
            </div>

            <div className="mt-4 grid max-h-[72vh] grid-cols-[132px_1fr] gap-3 overflow-hidden">
              <div className="space-y-2 overflow-y-auto pr-1">
                {isLoadingSets ? (
                  <div className="h-16 animate-pulse rounded-xl bg-[#11141a]" />
                ) : (
                  sets.map((set) => (
                    <button
                      key={set.id}
                      type="button"
                      onClick={() => loadSetCards(set)}
                      className={`w-full rounded-xl border p-2 text-left ${
                        selectedSet?.id === set.id
                          ? "border-[#7dd3fc]/60 bg-[#122033]"
                          : "border-[#252b34] bg-[#101318]"
                      }`}
                    >
                      <p className="line-clamp-2 text-xs font-semibold text-white">{set.name}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">{set.totalCards} cards</p>
                    </button>
                  ))
                )}
              </div>

              <div className="space-y-2 overflow-y-auto pr-1">
                {!selectedSet ? (
                  <div className="rounded-xl border border-dashed border-[#303640] bg-[#101318] p-3 text-sm text-zinc-400">
                    Select a set to see cards.
                  </div>
                ) : isLoadingSetCards ? (
                  [0, 1, 2].map((item) => <div key={item} className="h-[92px] animate-pulse rounded-2xl bg-[#11141a]" />)
                ) : (
                  setCards.map((card) => (
                    <CardSelectButton
                      key={card.id}
                      card={card}
                      selected={selectedCard?.id === card.id}
                      onSelect={() => selectCard(card)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </MobileShell>
  );
}

export default function DealCheckPage() {
  return (
    <Suspense
      fallback={
        <MobileShell title="Deal Check" subtitle="Check a price before you buy." showBackButton backFallbackHref="/search">
          <section className="rounded-2xl border border-[#242b35] bg-[#0d0f13] p-4 text-sm text-zinc-400">
            Loading deal check...
          </section>
        </MobileShell>
      }
    >
      <DealCheckContent />
    </Suspense>
  );
}
