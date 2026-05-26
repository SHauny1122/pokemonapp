"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CardCollectionActions } from "@/components/card-collection-actions";
import { useCollection } from "@/components/collection-provider";
import { useCurrency } from "@/components/currency-provider";
import { MobileShell } from "@/components/mobile-shell";
import { PortfolioChartCard } from "@/components/portfolio-chart-card";

const PORTFOLIO_PREVIEW_LIMIT = 4;

export default function CollectionPage() {
  const { cards, totalCards, totalValue, isHydrated, isSyncing, syncError } = useCollection();
  const { formatUsd } = useCurrency();
  const [showFullPortfolio, setShowFullPortfolio] = useState(false);

  const topCollectionCards = useMemo(() => {
    return [...cards]
      .sort((a, b) => (b.card.marketValue ?? 0) * b.quantity - (a.card.marketValue ?? 0) * a.quantity)
      .slice(0, PORTFOLIO_PREVIEW_LIMIT);
  }, [cards]);

  const displayedCards = showFullPortfolio ? cards : topCollectionCards;

  return (
    <MobileShell title="My Collection" subtitle="Track value, movement, and opportunities.">
      <section className="space-y-5">
        {isSyncing ? (
          <article className="rounded-2xl border border-dashed border-[#3a3b42] bg-[#14161d] p-3 text-xs text-zinc-300">
            Syncing your account collection...
          </article>
        ) : null}

        {syncError ? (
          <article className="rounded-2xl border border-dashed border-[#4a3e2a] bg-[#1a1610] p-3 text-xs text-amber-200">
            {syncError}
          </article>
        ) : null}

        <PortfolioChartCard
          cards={cards}
          totalCards={totalCards}
          totalValue={totalValue}
          isHydrated={isHydrated}
          showTotalValue={false}
        />

        <article className="rounded-2xl border border-[#242b35] bg-[#0d0f13] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Total collection value</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-white">{isHydrated ? formatUsd(totalValue) : "..."}</p>
          <p className="mt-2 text-sm text-zinc-400">{isHydrated ? totalCards : 0} cards in your portfolio</p>
        </article>

        {isHydrated && cards.length === 0 ? (
          <article className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-5 text-sm text-zinc-400">
            <p>Your collection is empty. Start with one card and build from there.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Link
                href="/scan"
                className="inline-flex items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-2 py-2 text-xs font-medium text-white"
              >
                Scan
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-2 py-2 text-xs font-medium text-white"
              >
                Search
              </Link>
              <Link
                href="/sets"
                className="inline-flex items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-2 py-2 text-xs font-medium text-white"
              >
                Sets
              </Link>
            </div>
          </article>
        ) : null}

        {isHydrated && cards.length > 0 ? (
          <article className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Portfolio preview</p>
                <p className="text-xs text-zinc-500">
                  {showFullPortfolio ? "All cards in your collection" : "Top cards by collection value"}
                </p>
              </div>
              {cards.length > PORTFOLIO_PREVIEW_LIMIT ? (
                <button
                  type="button"
                  onClick={() => setShowFullPortfolio((current) => !current)}
                  className="rounded-full border border-[#28303b] bg-[#111722] px-3 py-1.5 text-xs font-medium text-[#7dd3fc]"
                >
                  {showFullPortfolio ? "Show top" : "View all"}
                </button>
              ) : null}
            </div>
          </article>
        ) : null}

        <article className="grid grid-cols-2 gap-2.5">
          {displayedCards.map(({ card, quantity }) => (
            <div key={card.id} className="rounded-xl border border-[#292929] bg-[#15161a] p-2.5">
              {(() => {
                const hasImageUrl = card.image.startsWith("http://") || card.image.startsWith("https://");
                const marketValueText = card.marketValue !== null ? formatUsd(card.marketValue) : "Price unavailable";

                return (
                  <>
                    <Link href={`/detail?type=card&id=${card.id}`} className="block">
                      <div className="overflow-hidden rounded-lg border border-[#2d2d2d] bg-[#101114]">
                        {hasImageUrl ? (
                          <img src={card.image} alt={card.name} className="h-28 w-full object-contain" />
                        ) : (
                          <div className="flex h-28 w-full items-center justify-center bg-gradient-to-b from-[#1a1b21] to-[#111218]">
                            <span className="text-3xl">{card.image || "🃏"}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2.5 space-y-1">
                        <p className="line-clamp-2 text-xs font-semibold text-white">{card.name}</p>
                        <p className="line-clamp-1 text-[11px] text-zinc-400">{card.set}</p>
                        <div className="mt-1.5 flex items-end justify-between gap-2">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Market</p>
                            <p className="text-xs font-semibold text-white">{marketValueText}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Qty</p>
                            <p className="text-xs font-semibold text-[#e1b54f]">{quantity}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </>
                );
              })()}

              <div className="mt-2.5">
                <CardCollectionActions cardId={card.id} compact showHelperText={false} />
              </div>
            </div>
          ))}
        </article>
      </section>
    </MobileShell>
  );
}
