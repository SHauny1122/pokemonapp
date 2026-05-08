"use client";

import Link from "next/link";
import { useCurrency } from "@/components/currency-provider";
import { Card } from "@/lib/cards/types";

type SetCardsListProps = {
  cards: Card[];
};

export function SetCardsList({ cards }: SetCardsListProps) {
  const { formatUsd } = useCurrency();

  return (
    <article className="space-y-3">
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
          No cards are available for this set right now.
        </div>
      ) : null}

      {cards.map((card) => (
        <Link
          key={card.id}
          href={`/cards/${card.id}`}
          className="flex items-center justify-between rounded-2xl border border-[#292929] bg-[#15161a] px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-white">{card.name}</p>
            <p className="text-xs text-zinc-400">
              {card.number} • {card.rarity} • {card.type}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-white">
              {card.marketValue !== null ? formatUsd(card.marketValue) : "Price unavailable"}
            </p>
            <p className="text-xs text-[#e1b54f]">Flip {card.flipScore}</p>
          </div>
        </Link>
      ))}
    </article>
  );
}
