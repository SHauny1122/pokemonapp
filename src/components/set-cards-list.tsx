"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCurrency } from "@/components/currency-provider";
import { Card } from "@/lib/cards/types";

type SetCardsListProps = {
  cards: Card[];
};

const INITIAL_VISIBLE_CARDS = 8;
const LOAD_MORE_STEP = 16;

function getGridImageUrl(card: Card) {
  return card.imageSmall ?? card.image;
}

export function SetCardsList({ cards }: SetCardsListProps) {
  const { formatUsd } = useCurrency();
  const [previewCard, setPreviewCard] = useState<Card | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [startedImages, setStartedImages] = useState<Record<string, boolean>>({});
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_CARDS);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const displayedCards = useMemo(() => cards.slice(0, visibleCount), [cards, visibleCount]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_CARDS);
    setLoadedImages({});
    setFailedImages({});
    setStartedImages({});
  }, [cards]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || visibleCount >= cards.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }

        setVisibleCount((current) => Math.min(current + LOAD_MORE_STEP, cards.length));
      },
      {
        root: null,
        rootMargin: "200px 0px",
        threshold: 0.1,
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [cards.length, visibleCount]);

  useEffect(() => {
    const toStart = displayedCards.filter((card) => {
      const imageUrl = getGridImageUrl(card);
      return Boolean(imageUrl) && !startedImages[card.id];
    });

    if (toStart.length === 0) {
      return;
    }

    setStartedImages((current) => {
      const next = { ...current };
      toStart.forEach((card) => {
        next[card.id] = true;
      });
      return next;
    });

    if (process.env.NODE_ENV === "production") {
      return;
    }

    toStart.forEach((card) => {
      console.info("[SetCardsList] image start", {
        cardId: card.id,
        cardName: card.name,
        smallImageUrl: card.imageSmall,
        largeImageUrl: card.imageLarge,
        rawGridUrl: getGridImageUrl(card),
      });
    });
  }, [displayedCards, startedImages]);

  const logImageEvent = (
    event: "loaded" | "failed" | "start-dom",
    card: Card,
    imageUrl: string
  ) => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const logger = event === "failed" ? console.warn : console.info;
    logger("[SetCardsList] image event", {
      event,
      cardId: card.id,
      cardName: card.name,
      smallImageUrl: card.imageSmall,
      largeImageUrl: card.imageLarge,
      imageUrl,
    });
  };

  const handleImageLoaded = (card: Card, imageUrl: string) => {
    setLoadedImages((current) => ({ ...current, [card.id]: true }));
    logImageEvent("loaded", card, imageUrl);
  };

  const handleImageFailed = (card: Card, imageUrl: string) => {
    setFailedImages((current) => ({ ...current, [card.id]: true }));
    logImageEvent("failed", card, imageUrl);
  };

  const closePreview = () => {
    setPreviewCard(null);
  };

  const loadedCount = displayedCards.filter((card) => loadedImages[card.id]).length;
  const failedCount = displayedCards.filter((card) => failedImages[card.id]).length;

  return (
    <article className="space-y-3 pb-2">
      {cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
          No cards are available for this set right now.
        </div>
      ) : null}

      {process.env.NODE_ENV !== "production" ? (
        <div className="rounded-2xl border border-[#2b2b31] bg-[#121318] p-3 text-xs text-zinc-300">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-[#e1b54f]">Image Debug</p>
            <button
              type="button"
              onClick={() => setShowDebugPanel((current) => !current)}
              className="rounded-lg border border-[#37373d] bg-[#17191f] px-2.5 py-1 text-[11px] text-zinc-200"
            >
              {showDebugPanel ? "Hide" : "Show"}
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
            <p>Total cards: {cards.length}</p>
            <p>Visible cards: {displayedCards.length}</p>
            <p>Loaded images: {loadedCount}</p>
            <p>Failed images: {failedCount}</p>
          </div>

          {showDebugPanel ? (
            <div className="mt-3 max-h-56 space-y-2 overflow-auto rounded-xl border border-[#2e2e35] bg-[#0f1014] p-2">
              {displayedCards.map((card) => {
                const imageUrl = getGridImageUrl(card);
                const status = failedImages[card.id] ? "failed" : loadedImages[card.id] ? "loaded" : "pending";

                return (
                  <div key={`debug-${card.id}`} className="rounded-lg border border-[#26262c] bg-[#15161a] p-2">
                    <p className="font-medium text-zinc-200">
                      {card.name} ({card.id})
                    </p>
                    <p className="mt-1 break-all text-[10px] text-zinc-500">small: {card.imageSmall || "none"}</p>
                    <p className="mt-1 break-all text-[10px] text-zinc-500">large: {card.imageLarge || "none"}</p>
                    <p className="mt-1 break-all text-[10px] text-zinc-500">image: {imageUrl || "none"}</p>
                    <p className="mt-1 text-[10px] text-[#e1b54f]">status: {status}</p>
                    {imageUrl ? (
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-[10px] text-sky-300 underline"
                      >
                        Open image URL
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {displayedCards.map((card) => {
          const gridImageUrl = getGridImageUrl(card);
          const hasImage = Boolean(gridImageUrl);
          const imageFailed = failedImages[card.id];
          const imageLoaded = loadedImages[card.id];

          return (
            <article
              key={card.id}
              className="overflow-hidden rounded-xl border border-[#2a2a30] bg-[#15161a] shadow-[0_3px_12px_rgba(0,0,0,0.2)]"
            >
              <button
                type="button"
                onClick={() => setPreviewCard(card)}
                aria-label={`Preview ${card.name}`}
                className="block w-full text-left"
              >
                <div className="relative aspect-[5/7] w-full border-b border-[#2b2b31] bg-[#111216]">
                  {hasImage && !imageFailed ? (
                    <>
                      {!imageLoaded ? <div className="absolute inset-0 animate-pulse bg-[#1a1c21]" /> : null}
                      <img
                        src={gridImageUrl}
                        alt={card.name}
                        loading="lazy"
                        decoding="async"
                        width={245}
                        height={342}
                        onLoadStart={() => logImageEvent("start-dom", card, gridImageUrl)}
                        onLoad={() => handleImageLoaded(card, gridImageUrl)}
                        onError={() => handleImageFailed(card, gridImageUrl)}
                        className={`h-full w-full object-contain p-1.5 transition-opacity duration-200 ${
                          imageLoaded ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-b from-[#181a1f] to-[#101215] text-zinc-500">
                      <div className="text-center">
                        <p className="text-3xl">🃏</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.12em]">No image</p>
                      </div>
                    </div>
                  )}
                </div>
              </button>

              <div className="space-y-1.5 p-2">
                <div className="space-y-1">
                  <p className="line-clamp-1 text-xs font-semibold text-white">{card.name}</p>
                  <p className="line-clamp-1 text-xs text-zinc-400">
                    #{card.number} • {card.rarity}
                  </p>
                </div>

                <div className="flex items-end justify-between gap-1.5 rounded-lg border border-[#2d2d33] bg-[#111216] px-2 py-1.5">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.1em] text-zinc-500">Value</p>
                    <p className="text-[11px] font-semibold text-white">
                      {card.marketValue !== null ? formatUsd(card.marketValue) : "Price unavailable"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.1em] text-zinc-500">Signal</p>
                    <p className="text-[11px] font-semibold text-[#e1b54f]">{card.flipScore ?? "-"}</p>
                  </div>
                </div>

                <Link
                  href={`/detail?type=card&id=${card.id}`}
                  className="inline-flex w-full items-center justify-center rounded-lg border border-[#323237] bg-[#17191f] px-2 py-1.5 text-[11px] font-medium text-zinc-100"
                >
                  Open details
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {visibleCount < cards.length ? (
        <div ref={loadMoreRef} className="flex justify-center py-2">
          <div className="rounded-full border border-[#2a2a30] bg-[#121318] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            Loading more cards...
          </div>
        </div>
      ) : null}

      {previewCard ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4"
          style={{
            paddingTop: "calc(1rem + var(--safe-area-inset-top))",
            paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))",
            paddingLeft: "calc(1rem + var(--safe-area-inset-left))",
            paddingRight: "calc(1rem + var(--safe-area-inset-right))",
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`${previewCard.name} preview`}
          onClick={closePreview}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[#2a2a30] bg-[#131419] p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="line-clamp-1 text-base font-semibold text-white">{previewCard.name}</p>
                <p className="mt-1 text-xs text-zinc-400">
                  #{previewCard.number} • {previewCard.rarity}
                </p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                aria-label="Close preview"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#3a3a3a] bg-[#17181d] text-sm text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#2c2c32] bg-[#0f1014]">
              {previewCard.image ? (
                <img
                  src={previewCard.imageLarge ?? previewCard.image}
                  alt={previewCard.name}
                  loading="lazy"
                  decoding="async"
                  className="h-[60vh] max-h-[420px] w-full object-contain p-2"
                />
              ) : (
                <div className="flex h-72 items-center justify-center bg-gradient-to-b from-[#1a1c21] to-[#0e1014] text-zinc-500">
                  <div className="text-center">
                    <p className="text-4xl">🃏</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.12em]">No image</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-end justify-between gap-2 text-sm">
              <p className="text-zinc-300">{previewCard.marketValue !== null ? formatUsd(previewCard.marketValue) : "Price unavailable"}</p>
              <p className="text-[#e1b54f]">Value signal {previewCard.flipScore ?? "-"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
