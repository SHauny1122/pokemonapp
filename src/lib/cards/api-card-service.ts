import { mockCardService } from "@/lib/cards/mock-card-service";
import { evaluateDealCheck } from "@/lib/cards/deal-check-engine";
import {
  CardService,
  DealCheckResult,
  PriceSummary,
} from "@/lib/cards/types";
import {
  cacheCard,
  cacheCards,
  cacheSearch,
  cacheSet,
  cacheSetCards,
  cacheSets,
  getCachedCardById,
  getCachedSearch,
  getCachedSetById,
  getCachedSetCards,
} from "@/lib/cards/providers/card-cache";
import { buildPokemonCardSearchQuery } from "@/lib/cards/providers/card-search";
import { normalizePokemonCard, normalizePokemonSet } from "@/lib/cards/providers/card-normalizers";
import {
  fetchPokemonCardById,
  fetchPokemonCardsBySet,
  fetchPokemonSetById,
  fetchPokemonSets,
  searchPokemonCards,
} from "@/lib/cards/providers/pokemon-tcg-provider";

export function getCachedApiCardById(id: string) {
  return getCachedCardById(id);
}

async function fallbackSearch(query: string) {
  return mockCardService.searchCards(query);
}

async function fallbackGetCardById(id: string) {
  return mockCardService.getCardById(id);
}

export const apiCardService: CardService = {
  async searchCards(query, pagination) {
    const useDefaultSearchCache = !pagination?.page && !pagination?.pageSize;
    const cached = useDefaultSearchCache ? getCachedSearch(query) : undefined;

    if (cached) {
      return cached;
    }

    try {
      const providerQuery = buildPokemonCardSearchQuery(query);
      const cards = (await searchPokemonCards(providerQuery, pagination)).map(normalizePokemonCard);

      cacheCards(cards);
      if (useDefaultSearchCache) {
        cacheSearch(query, cards);
      }
      return cards;
    } catch {
      return fallbackSearch(query);
    }
  },

  async getCardById(id) {
    const cached = getCachedCardById(id);

    if (cached) {
      return cached;
    }

    try {
      const card = normalizePokemonCard(await fetchPokemonCardById(id));
      cacheCard(card);
      return card;
    } catch {
      return fallbackGetCardById(id);
    }
  },

  async getSets(pagination) {
    try {
      const sets = (await fetchPokemonSets(pagination)).map(normalizePokemonSet);
      cacheSets(sets);
      return sets;
    } catch {
      return [];
    }
  },

  async getSetById(setId) {
    const cached = getCachedSetById(setId);

    if (cached) {
      return cached;
    }

    try {
      const set = normalizePokemonSet(await fetchPokemonSetById(setId));
      cacheSet(set);
      return set;
    } catch {
      return undefined;
    }
  },

  async getCardsBySet(setId, pagination) {
    const useDefaultSetCache = !pagination?.page && !pagination?.pageSize;
    const cached = useDefaultSetCache ? getCachedSetCards(setId) : undefined;

    if (cached) {
      return cached;
    }

    try {
      const cards = (await fetchPokemonCardsBySet(setId, pagination)).map(normalizePokemonCard);
      cacheCards(cards);
      if (useDefaultSetCache) {
        cacheSetCards(setId, cards);
      }
      return cards;
    } catch {
      return [];
    }
  },

  getPriceSummary(cardId): PriceSummary | undefined {
    const cached = getCachedCardById(cardId);

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

    const cached = getCachedCardById(cardId);

    if (cached && cached.marketValue !== null && cached.marketValue > 0) {
      return evaluateDealCheck(cached, askingPrice);
    }

    return undefined;
  },
};
