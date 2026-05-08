import { mockCardService } from "@/lib/cards/mock-card-service";
import { evaluateDealCheck } from "@/lib/cards/deal-check-engine";
import { mockCards } from "@/lib/mock-data";
import {
  Card,
  CardPriceBreakdown,
  CardPricing,
  CardService,
  CardSet,
  DealCheckResult,
  PriceSummary,
} from "@/lib/cards/types";

const API_BASE_URL = "https://api.pokemontcg.io/v2";

type PokemonTcgSet = {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  total: number;
};

type PokemonTcgCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  types?: string[];
  images?: {
    small?: string;
  };
  tcgplayer?: {
    prices?: Record<string, PokemonTcgPricePoint | undefined>;
  };
  set: PokemonTcgSet;
};

type PokemonTcgPricePoint = {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
};

const setCache = new Map<string, CardSet>();
const cardCache = new Map<string, Card>();

export function getCachedApiCardById(id: string) {
  return cardCache.get(id);
}

function toUsdAmount(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.round(value * 100) / 100;
}

function mapPriceBreakdown(raw: PokemonTcgPricePoint | undefined): CardPriceBreakdown | undefined {
  if (!raw) {
    return undefined;
  }

  const breakdown: CardPriceBreakdown = {
    low: toUsdAmount(raw.low),
    mid: toUsdAmount(raw.mid),
    high: toUsdAmount(raw.high),
    market: toUsdAmount(raw.market),
    directLow: toUsdAmount(raw.directLow),
  };

  if (
    breakdown.low === undefined &&
    breakdown.mid === undefined &&
    breakdown.high === undefined &&
    breakdown.market === undefined &&
    breakdown.directLow === undefined
  ) {
    return undefined;
  }

  return breakdown;
}

function pickBestPrice(prices: Record<string, CardPriceBreakdown>) {
  const fallbackOrder = ["market", "mid", "high", "low"] as const;

  for (const priceType of fallbackOrder) {
    for (const [variant, breakdown] of Object.entries(prices)) {
      const candidate = breakdown[priceType];

      if (candidate !== undefined) {
        return {
          value: candidate,
          variant,
          priceType,
        };
      }
    }
  }

  return undefined;
}

function hashToRange(seed: string, min: number, max: number) {
  const hash = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return min + (hash % (max - min + 1));
}

function buildPlaceholderHistory(baseValue: number) {
  return [
    { date: "Jan", value: Math.max(1, Math.round(baseValue * 0.9)) },
    { date: "Feb", value: Math.max(1, Math.round(baseValue * 0.94)) },
    { date: "Mar", value: Math.max(1, Math.round(baseValue * 0.97)) },
    { date: "Apr", value: Math.max(1, Math.round(baseValue * 0.99)) },
    { date: "May", value: Math.max(1, Math.round(baseValue)) },
  ];
}

function mapSet(rawSet: PokemonTcgSet): CardSet {
  const existing = setCache.get(rawSet.id);

  if (existing) {
    return existing;
  }

  const mapped: CardSet = {
    id: rawSet.id,
    name: rawSet.name,
    era: rawSet.series,
    releaseYear: Number(rawSet.releaseDate?.slice(0, 4)) || new Date().getFullYear(),
    icon: "🃏",
    totalCards: rawSet.total,
  };

  setCache.set(mapped.id, mapped);
  return mapped;
}

function mapCard(rawCard: PokemonTcgCard): Card {
  const existing = cardCache.get(rawCard.id);

  if (existing) {
    return existing;
  }

  const fallbackMockMarketValue = mockCards.find((card) => card.id === rawCard.id)?.marketValue ?? null;
  const fallbackMarketValueSeed = hashToRange(rawCard.id, 20, 900);
  const flipScore = hashToRange(rawCard.id, 45, 90);
  const trendCycle = hashToRange(rawCard.id, 0, 2);

  const variantPrices: Record<string, CardPriceBreakdown> = {};

  Object.entries(rawCard.tcgplayer?.prices ?? {}).forEach(([variant, rawBreakdown]) => {
    const mappedBreakdown = mapPriceBreakdown(rawBreakdown);

    if (mappedBreakdown) {
      variantPrices[variant] = mappedBreakdown;
    }
  });

  const selected = pickBestPrice(variantPrices);
  const pricing: CardPricing | undefined =
    Object.keys(variantPrices).length > 0
      ? {
          currency: "USD",
          source: "tcgplayer",
          selectedVariant: selected?.variant,
          selectedPriceType: selected?.priceType,
          variants: variantPrices,
        }
      : undefined;

  const fallbackMarketValue = fallbackMockMarketValue ?? fallbackMarketValueSeed;
  const marketValue = selected?.value ?? fallbackMarketValue;

  const mapped: Card = {
    id: rawCard.id,
    name: rawCard.name,
    type: rawCard.types?.[0] ?? "Unknown",
    setId: rawCard.set.id,
    set: rawCard.set.name,
    number: rawCard.number,
    rarity: rawCard.rarity ?? "Unknown",
    image: rawCard.images?.small ?? "",
    marketValue,
    pricing,
    flipScore,
    trend: trendCycle === 0 ? "up" : trendCycle === 1 ? "flat" : "down",
    history: buildPlaceholderHistory(marketValue ?? fallbackMarketValueSeed),
  };

  cardCache.set(mapped.id, mapped);
  setCache.set(rawCard.set.id, mapSet(rawCard.set));
  return mapped;
}

async function fetchJson<T>(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`Pokemon TCG API request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

async function fallbackSearch(query: string) {
  return mockCardService.searchCards(query);
}

async function fallbackGetCardById(id: string) {
  return mockCardService.getCardById(id);
}

async function fallbackGetSets() {
  return mockCardService.getSets();
}

async function fallbackGetSetById(setId: string) {
  return mockCardService.getSetById(setId);
}

async function fallbackGetCardsBySet(setId: string) {
  return mockCardService.getCardsBySet(setId);
}

export const apiCardService: CardService = {
  async searchCards(query) {
    try {
      const q = query.trim();
      const filter = q ? `name:*${q}* OR set.name:*${q}* OR number:*${q}* OR rarity:*${q}* OR types:*${q}*` : "";
      const url = `/cards?pageSize=24${filter ? `&q=${encodeURIComponent(filter)}` : ""}`;
      const payload = await fetchJson<{ data: PokemonTcgCard[] }>(url);
      return payload.data.map(mapCard);
    } catch {
      return fallbackSearch(query);
    }
  },

  async getCardById(id) {
    const cached = cardCache.get(id);

    if (cached) {
      return cached;
    }

    try {
      const payload = await fetchJson<{ data: PokemonTcgCard }>(`/cards/${id}`);
      return mapCard(payload.data);
    } catch {
      return fallbackGetCardById(id);
    }
  },

  async getSets() {
    try {
      const payload = await fetchJson<{ data: PokemonTcgSet[] }>("/sets?pageSize=80");
      return payload.data.map(mapSet);
    } catch {
      return fallbackGetSets();
    }
  },

  async getSetById(setId) {
    const cached = setCache.get(setId);

    if (cached) {
      return cached;
    }

    try {
      const payload = await fetchJson<{ data: PokemonTcgSet }>(`/sets/${setId}`);
      return mapSet(payload.data);
    } catch {
      return fallbackGetSetById(setId);
    }
  },

  async getCardsBySet(setId) {
    try {
      const payload = await fetchJson<{ data: PokemonTcgCard[] }>(
        `/cards?pageSize=50&q=${encodeURIComponent(`set.id:${setId}`)}`
      );
      return payload.data.map(mapCard);
    } catch {
      return fallbackGetCardsBySet(setId);
    }
  },

  getPriceSummary(cardId): PriceSummary | undefined {
    const cached = cardCache.get(cardId);

    if (cached) {
      return {
        cardId,
        marketPrice: cached.marketValue,
        pricing: cached.pricing,
        flipScore: cached.flipScore,
        trend: cached.trend,
        history: cached.history,
      };
    }

    return mockCardService.getPriceSummary(cardId);
  },

  getDealCheck(cardId, askingPrice): DealCheckResult | undefined {
    if (!Number.isFinite(askingPrice) || askingPrice <= 0) {
      return undefined;
    }

    const cached = cardCache.get(cardId);

    if (cached && cached.marketValue !== null && cached.marketValue > 0) {
      return evaluateDealCheck(cached, askingPrice);
    }

    return mockCardService.getDealCheck(cardId, askingPrice);
  },
};
