import {
  PokemonTcgCardRecord,
  PokemonTcgSetRecord,
} from "@/lib/cards/providers/pokemon-tcg-provider";
import { Card, CardPriceBreakdown, CardPricing, CardSet, PriceTrend } from "@/lib/cards/types";

function toUsdAmount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.round(value * 100) / 100;
}

function mapPriceBreakdown(raw: {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
} | undefined): CardPriceBreakdown | undefined {
  if (!raw) {
    return undefined;
  }

  const mapped: CardPriceBreakdown = {
    low: toUsdAmount(raw.low),
    mid: toUsdAmount(raw.mid),
    high: toUsdAmount(raw.high),
    market: toUsdAmount(raw.market),
    directLow: toUsdAmount(raw.directLow),
  };

  if (
    mapped.low === undefined &&
    mapped.mid === undefined &&
    mapped.high === undefined &&
    mapped.market === undefined &&
    mapped.directLow === undefined
  ) {
    return undefined;
  }

  return mapped;
}

function pickBestPrice(prices: Record<string, CardPriceBreakdown>) {
  const fallbackOrder = ["market", "mid", "high", "low"] as const;

  for (const priceType of fallbackOrder) {
    for (const [variant, breakdown] of Object.entries(prices)) {
      const value = breakdown[priceType];

      if (value !== undefined) {
        return {
          value,
          variant,
          priceType,
        };
      }
    }
  }

  return undefined;
}

function mapCardmarketBreakdown(raw: { averageSellPrice?: number; lowPrice?: number; trendPrice?: number } | undefined) {
  if (!raw) {
    return undefined;
  }

  const mapped: CardPriceBreakdown = {
    low: toUsdAmount(raw.lowPrice),
    mid: toUsdAmount(raw.averageSellPrice),
    market: toUsdAmount(raw.trendPrice),
  };

  if (mapped.low === undefined && mapped.mid === undefined && mapped.market === undefined) {
    return undefined;
  }

  return mapped;
}

function deriveTrend(cardmarket: CardPriceBreakdown | undefined): PriceTrend {
  const marketVsMidCardmarket =
    cardmarket?.market !== undefined && cardmarket?.mid !== undefined && cardmarket.mid > 0
      ? (cardmarket.market - cardmarket.mid) / cardmarket.mid
      : undefined;

  if (marketVsMidCardmarket !== undefined) {
    if (marketVsMidCardmarket > 0.03) {
      return "up";
    }

    if (marketVsMidCardmarket < -0.03) {
      return "down";
    }
  }

  return "flat";
}

function computeFlipScore(
  rarity: string | undefined,
  marketValue: number | null,
  tcgplayerPrices: Record<string, CardPriceBreakdown>,
  cardmarket: CardPriceBreakdown | undefined
) {
  const rarityText = (rarity ?? "").toLowerCase();
  const rarityBoost = /secret|ultra|holo|rare/.test(rarityText) ? 14 : /uncommon/.test(rarityText) ? 6 : 2;
  const tcgSignalBoost = Object.keys(tcgplayerPrices).length > 0 ? 8 : 0;
  const cardmarketSignalBoost = cardmarket ? 6 : 0;
  const valueBoost = marketValue && marketValue >= 75 ? 6 : marketValue && marketValue >= 20 ? 3 : 0;

  return Math.max(28, Math.min(92, 34 + rarityBoost + tcgSignalBoost + cardmarketSignalBoost + valueBoost));
}

export function normalizePokemonSet(rawSet: PokemonTcgSetRecord): CardSet {
  return {
    id: rawSet.id,
    name: rawSet.name,
    era: rawSet.series ?? "Pokemon TCG",
    releaseYear: Number(rawSet.releaseDate?.slice(0, 4)) || new Date().getFullYear(),
    icon: "🃏",
    totalCards: rawSet.total ?? rawSet.printedTotal ?? 0,
  };
}

export function normalizePokemonCard(rawCard: PokemonTcgCardRecord): Card {
  const tcgplayerVariants: Record<string, CardPriceBreakdown> = {};

  Object.entries(rawCard.tcgplayer?.prices ?? {}).forEach(([variant, rawBreakdown]) => {
    const mapped = mapPriceBreakdown(rawBreakdown);

    if (mapped) {
      tcgplayerVariants[variant] = mapped;
    }
  });

  const preferredPrice = pickBestPrice(tcgplayerVariants);
  const cardmarket = mapCardmarketBreakdown(rawCard.cardmarket?.prices);
  const marketValue = preferredPrice?.value ?? cardmarket?.market ?? cardmarket?.mid ?? cardmarket?.low ?? null;

  const pricing: CardPricing | undefined =
    Object.keys(tcgplayerVariants).length > 0
      ? {
          currency: "USD",
          source: "tcgplayer",
          selectedVariant: preferredPrice?.variant,
          selectedPriceType: preferredPrice?.priceType,
          variants: tcgplayerVariants,
        }
      : undefined;

  return {
    id: rawCard.id,
    name: rawCard.name,
    type: rawCard.types?.[0] ?? "Unknown",
    types: rawCard.types,
    supertype: rawCard.supertype,
    setId: rawCard.set.id,
    set: rawCard.set.name,
    releaseDate: rawCard.set.releaseDate,
    number: rawCard.number,
    rarity: rawCard.rarity ?? "Unknown",
    image: rawCard.images?.small ?? rawCard.images?.large ?? "",
    marketValue,
    pricing,
    tcgplayerPrices: Object.keys(tcgplayerVariants).length > 0 ? tcgplayerVariants : undefined,
    cardmarketPrices: cardmarket,
    priceUpdatedAt: rawCard.updatedAt,
    flipScore: computeFlipScore(rawCard.rarity, marketValue, tcgplayerVariants, cardmarket),
    trend: deriveTrend(cardmarket),
    history: [],
    dataSource: "pokemon-tcg-api",
  };
}
