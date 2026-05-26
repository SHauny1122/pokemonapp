"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCollection } from "@/components/collection-provider";
import { useCurrency } from "@/components/currency-provider";
import { CurrencySelector } from "@/components/currency-selector";
import { MobileShell } from "@/components/mobile-shell";
import { buildCollectionHistory, CollectionRange } from "@/lib/cards/collection-history";

const HOME_RANGES: CollectionRange[] = ["7D", "1M", "3M", "MAX"];
const TOP_COLLECTION_CARDS_LIMIT = 5;

export default function Home() {
  const { cards: collectionCards, totalCards, totalValue, isHydrated } = useCollection();
  const { formatUsd } = useCurrency();
  const [selectedRange, setSelectedRange] = useState<CollectionRange>("1M");
  const [showPortfolioValues, setShowPortfolioValues] = useState(true);
  const topCollectionCards = useMemo(() => {
    return [...collectionCards]
      .sort((a, b) => (b.card.marketValue ?? 0) - (a.card.marketValue ?? 0))
      .slice(0, TOP_COLLECTION_CARDS_LIMIT);
  }, [collectionCards]);

  const historySeries = useMemo(() => {
    return buildCollectionHistory(collectionCards, totalValue, selectedRange);
  }, [collectionCards, totalValue, selectedRange]);

  const chartPoints = historySeries.points;
  const minValue = Math.min(...chartPoints.map((point) => point.value));
  const maxValue = Math.max(...chartPoints.map((point) => point.value));
  const valueRange = Math.max(maxValue - minValue, 1);
  const chartWidth = 300;
  const chartHeight = 112;

  const chartCoordinates = chartPoints.map((point, index) => {
    const x = chartPoints.length <= 1 ? chartWidth : (index / (chartPoints.length - 1)) * chartWidth;
    const y = chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
    return { x, y };
  });

  const linePath = chartCoordinates
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;
  const isUp = historySeries.changeValue >= 0;

  return (
    <MobileShell title="Home" subtitle="Your collection portfolio.">
      <section className="space-y-6">
        <article className="rounded-2xl bg-[#0d0f13] p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Total Collection Value</p>
            <CurrencySelector compact />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <h2 className="text-4xl font-semibold tracking-tight text-white">
              {showPortfolioValues ? (isHydrated ? formatUsd(totalValue) : "...") : "••••••"}
            </h2>
            <button
              type="button"
              onClick={() => setShowPortfolioValues((current) => !current)}
              aria-label={showPortfolioValues ? "Hide portfolio value" : "Show portfolio value"}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#141821] text-[#7dd3fc]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
                <circle cx="12" cy="12" r="3" />
                {!showPortfolioValues ? <path d="M4 20 20 4" /> : null}
              </svg>
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className={isUp ? "text-emerald-300" : "text-rose-300"}>
              {showPortfolioValues
                ? `${isHydrated ? `${isUp ? "+" : ""}${historySeries.changePercent.toFixed(1)}%` : "..."} (${selectedRange})`
                : `•••••• (${selectedRange})`}
            </span>
            <span className="text-zinc-500">{isHydrated ? totalCards : 0} cards</span>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl bg-[#090b0f] px-1 py-1">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.14em] text-zinc-500">Portfolio trend</p>
              <p className={`text-xs ${isUp ? "text-emerald-300" : "text-rose-300"}`}>
                {isUp ? "Up" : "Down"} in {selectedRange}
              </p>
            </div>
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 6}`} className="h-32 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="homeValueArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#homeValueArea)" />
              <path d={linePath} fill="none" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {HOME_RANGES.map((range) => {
              const active = range === selectedRange;

              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => setSelectedRange(range)}
                  className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                    active
                      ? "bg-[#131b26] text-[#7dd3fc]"
                      : "bg-[#101217] text-zinc-500"
                  }`}
                >
                  {range}
                </button>
              );
            })}
          </div>
        </article>

        <article className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-400">Most Valuable Cards</p>
            <Link href="/collection" className="text-xs font-medium text-[#7dd3fc]">
              View All
            </Link>
          </div>

          {isHydrated && topCollectionCards.length === 0 ? (
            <div className="rounded-2xl bg-[#0d0f13] p-5 text-sm text-zinc-400">
              <p>Your collection is empty. Add cards to see your most valuable picks here.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/scan"
                  className="inline-flex items-center justify-center rounded-xl bg-[#11151d] px-2 py-2 text-xs font-medium text-[#7dd3fc]"
                >
                  Scan
                </Link>
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center rounded-xl bg-[#11151d] px-2 py-2 text-xs font-medium text-[#7dd3fc]"
                >
                  Search
                </Link>
              </div>
            </div>
          ) : null}

          {topCollectionCards.map(({ card, quantity }) => (
            <Link
              key={card.id}
              href={`/detail?type=card&id=${card.id}`}
              className="flex items-center justify-between rounded-2xl bg-[#0d0f13] px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-white">{card.name}</p>
                <p className="text-xs text-zinc-400">
                  {card.set} {card.number}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {card.marketValue !== null ? formatUsd(card.marketValue) : "Price unavailable"}
                </p>
                <p className="text-xs text-[#7dd3fc]">Qty {quantity}</p>
              </div>
            </Link>
          ))}
        </article>
      </section>
    </MobileShell>
  );
}
