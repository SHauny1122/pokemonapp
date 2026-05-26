"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CardDetailContent } from "@/components/card-detail-content";
import { MobileShell } from "@/components/mobile-shell";
import { SetCardsList } from "@/components/set-cards-list";
import { getCardById, getCardsBySet, getSetById } from "@/lib/cards/card-service";
import { Card, CardSet } from "@/lib/cards/types";

function DetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const [card, setCard] = useState<Card | null>(null);
  const [set, setSet] = useState<CardSet | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!type || !id) {
        setError("Type and ID are required");
        setIsLoading(false);
        return;
      }

      try {
        if (type === "card") {
          const cardData = await getCardById(id);
          if (!cardData) {
            setError("Card not found");
          } else {
            setCard(cardData);
          }
        } else if (type === "set") {
          const setData = await getSetById(id);
          if (!setData) {
            setError("Set not found");
          } else {
            setSet(setData);
            const cardsData = await getCardsBySet(id);
            setCards(cardsData);
          }
        } else {
          setError("Invalid type. Must be 'card' or 'set'");
        }
      } catch (err) {
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [type, id]);

  if (isLoading) {
    return (
      <MobileShell title="Loading" subtitle="..." showBackButton backFallbackHref="/search">
        <div className="flex justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e1b54f] border-t-transparent" />
        </div>
      </MobileShell>
    );
  }

  if (error) {
    return (
      <MobileShell title="Error" subtitle="Data not found" showBackButton backFallbackHref="/search">
        <div className="rounded-2xl border border-[#27272a] bg-[#15161a] p-4 text-sm text-zinc-400">
          {error}
        </div>
      </MobileShell>
    );
  }

  if (type === "card" && card) {
    return (
      <MobileShell title={card.name} subtitle={`${card.set} • ${card.number}`} showBackButton backFallbackHref="/search">
        <CardDetailContent card={card} />
      </MobileShell>
    );
  }

  if (type === "set" && set) {
    const isPartialList = set.totalCards > 0 && cards.length < set.totalCards;
    return (
      <MobileShell title={set.name} subtitle={`${set.era} • ${set.releaseYear}`} showBackButton backFallbackHref="/sets">
        <section className="space-y-4">
          <article className="rounded-2xl border border-[#27272a] bg-[#15161a] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Set Summary</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-zinc-300">Total set size</span>
              <span className="text-white">{set.totalCards}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-zinc-300">Catalog list</span>
              <span className="text-[#e1b54f]">{isPartialList ? `Showing first ${cards.length}` : `${cards.length} shown`}</span>
            </div>
          </article>
          <SetCardsList cards={cards} />
        </section>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Error" subtitle="Data not found" showBackButton backFallbackHref="/search">
      <div className="rounded-2xl border border-[#27272a] bg-[#15161a] p-4 text-sm text-zinc-400">
        Data not found
      </div>
    </MobileShell>
  );
}

export default function DetailPage() {
  return (
    <Suspense
      fallback={
        <MobileShell title="Loading" subtitle="..." showBackButton backFallbackHref="/search">
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#e1b54f] border-t-transparent" />
          </div>
        </MobileShell>
      }
    >
      <DetailContent />
    </Suspense>
  );
}
