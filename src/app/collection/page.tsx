"use client";

import Link from "next/link";
import { CardCollectionActions } from "@/components/card-collection-actions";
import { useCollection } from "@/components/collection-provider";
import { useCurrency } from "@/components/currency-provider";
import { MobileShell } from "@/components/mobile-shell";

export default function CollectionPage() {
  const { cards, totalCards, totalValue, isHydrated } = useCollection();
  const { formatUsd } = useCurrency();

  return (
    <MobileShell title="My Collection" subtitle="Track value, movement, and opportunities.">
      <section className="space-y-4">
        <article className="rounded-2xl border border-[#27272a] bg-[#15161a] p-5">
          <p className="text-sm text-zinc-400">Total Value</p>
          <p className="mt-1 text-3xl font-semibold text-white">
            {isHydrated ? formatUsd(totalValue) : "..."}
          </p>
          <p className="mt-1 text-sm text-zinc-400">{isHydrated ? totalCards : 0} cards saved on this device</p>
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

        <article className="grid grid-cols-2 gap-2.5">
          {cards.map(({ card, quantity }) => (
            <div key={card.id} className="rounded-xl border border-[#292929] bg-[#15161a] p-2.5">
              {(() => {
                const hasImageUrl = card.image.startsWith("http://") || card.image.startsWith("https://");
                const marketValueText = card.marketValue !== null ? formatUsd(card.marketValue) : "Price unavailable";

                return (
                  <>
                    <Link href={`/cards/${card.id}`} className="block">
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
