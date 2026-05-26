"use client";

import Link from "next/link";
import { CardCollectionActions } from "@/components/card-collection-actions";
import { useCurrency } from "@/components/currency-provider";
import { getSetsMockSync } from "@/lib/cards/card-service";
import { Card } from "@/lib/cards/types";

type CardDetailContentProps = {
  card: Card;
};

export function CardDetailContent({ card }: CardDetailContentProps) {
  const { formatUsd } = useCurrency();
  const relatedSet = getSetsMockSync().find((set) => set.name === card.set);
  const hasImageUrl = card.image.startsWith("http://") || card.image.startsWith("https://");
  const marketValueText = card.marketValue !== null ? formatUsd(card.marketValue) : "Price unavailable";

  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-[#27272a] bg-[#15161a] p-5">
        {hasImageUrl ? (
          <img
            src={card.image}
            alt={card.name}
            className="h-56 w-full rounded-xl border border-[#2b2b2b] object-contain bg-[#101114]"
          />
        ) : (
          <p className="text-5xl">{card.image}</p>
        )}
        <p className="mt-3 text-sm text-zinc-400">
          {card.rarity} • Type {card.type}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-[#292929] bg-[#101114] p-3">
            <p className="text-zinc-400">Market Value</p>
            <p className="mt-1 text-lg font-semibold text-white">{marketValueText}</p>
          </div>
          <div className="rounded-xl border border-[#292929] bg-[#101114] p-3">
            <p className="text-zinc-400">Flip Score</p>
            <p className="mt-1 text-lg font-semibold text-[#e1b54f]">{card.flipScore}/100</p>
          </div>
        </div>

        <div className="mt-4">
          <CardCollectionActions cardId={card.id} />
        </div>

        <div className="mt-2 grid gap-2">
          <Link
            href={`/deal-check?cardId=${card.id}`}
            className="inline-flex w-full items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-4 py-3 text-sm font-medium text-white"
          >
            Run Deal Check
          </Link>
          {relatedSet ? (
            <Link
              href={`/detail?type=set&id=${relatedSet.id}`}
              className="inline-flex w-full items-center justify-center rounded-xl border border-[#2f2f2f] bg-[#121317] px-4 py-3 text-sm font-medium text-zinc-200"
            >
              Browse {card.set}
            </Link>
          ) : null}
        </div>
      </article>

      <article className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-5">
        <h2 className="text-base font-semibold text-white">Price history coming soon</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Current market value is live where available. Historical trends will be added when connected to a
          verified price-history provider.
        </p>
      </article>
    </section>
  );
}
