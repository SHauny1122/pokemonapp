"use client";

import { useMemo, useState } from "react";
import { useCurrency } from "@/components/currency-provider";
import { buildCollectionHistory, CollectionRange } from "@/lib/cards/collection-history";
import { Card } from "@/lib/cards/types";

type CollectionCardEntry = {
  card: Card;
  quantity: number;
};

type PortfolioChartCardProps = {
  cards: CollectionCardEntry[];
  totalCards: number;
  totalValue: number;
  isHydrated: boolean;
  showTotalValue?: boolean;
};

const PORTFOLIO_RANGES: CollectionRange[] = ["7D", "1M", "3M", "MAX"];
const CHART_WIDTH = 300;
const CHART_HEIGHT = 112;

export function PortfolioChartCard({
  cards,
  totalCards,
  totalValue,
  isHydrated,
  showTotalValue = true,
}: PortfolioChartCardProps) {
  const { formatUsd } = useCurrency();
  const [selectedRange, setSelectedRange] = useState<CollectionRange>("1M");

  const historySeries = useMemo(() => {
    return buildCollectionHistory(cards, totalValue, selectedRange);
  }, [cards, totalValue, selectedRange]);

  const chartPoints = historySeries.points;
  const minValue = Math.min(...chartPoints.map((point) => point.value));
  const maxValue = Math.max(...chartPoints.map((point) => point.value));
  const valueRange = Math.max(maxValue - minValue, 1);

  const chartCoordinates = chartPoints.map((point, index) => {
    const x = chartPoints.length <= 1 ? CHART_WIDTH : (index / (chartPoints.length - 1)) * CHART_WIDTH;
    const y = CHART_HEIGHT - ((point.value - minValue) / valueRange) * CHART_HEIGHT;
    return { x, y };
  });

  const linePath = chartCoordinates
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${CHART_WIDTH} ${CHART_HEIGHT} L 0 ${CHART_HEIGHT} Z`;
  const isUp = historySeries.changeValue >= 0;

  return (
    <article className="rounded-2xl bg-[#0d0f13] p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Portfolio trend</p>
        <p className={`text-xs ${isUp ? "text-emerald-300" : "text-rose-300"}`}>
          {isUp ? "Up" : "Down"} in {selectedRange}
        </p>
      </div>

      {showTotalValue ? (
        <>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {isHydrated ? formatUsd(totalValue) : "..."}
          </h2>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className={isUp ? "text-emerald-300" : "text-rose-300"}>
              {isHydrated ? `${isUp ? "+" : ""}${historySeries.changePercent.toFixed(1)}%` : "..."} ({selectedRange})
            </span>
            <span className="text-zinc-500">{isHydrated ? totalCards : 0} cards</span>
          </div>
        </>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-xl bg-[#090b0f] px-1 py-1">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 6}`} className="h-32 w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="portfolioValueArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#portfolioValueArea)" />
          <path d={linePath} fill="none" stroke="#7dd3fc" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {PORTFOLIO_RANGES.map((range) => {
          const active = range === selectedRange;

          return (
            <button
              key={range}
              type="button"
              onClick={() => setSelectedRange(range)}
              className={`rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                active ? "bg-[#131b26] text-[#7dd3fc]" : "bg-[#101217] text-zinc-500"
              }`}
            >
              {range}
            </button>
          );
        })}
      </div>
    </article>
  );
}
