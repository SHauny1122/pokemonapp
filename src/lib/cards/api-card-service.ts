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
  getPokemonTcgDebugInfo,
  searchPokemonCards,
} from "@/lib/cards/providers/pokemon-tcg-provider";

type CatalogDebugState = {
  operation: string;
  status: "idle" | "success" | "fallback" | "empty" | "failed";
  message: string | null;
  requestUrl: string | null;
  statusCode: number | null;
  baseUrl: string;
  isNativeCapacitor: boolean;
  isUsingBackendProxy: boolean;
  hasApiBaseUrl: boolean;
};

const catalogDebugState: CatalogDebugState = {
  operation: "idle",
  status: "idle",
  message: null,
  requestUrl: null,
  statusCode: null,
  baseUrl: "",
  isNativeCapacitor: false,
  isUsingBackendProxy: false,
  hasApiBaseUrl: false,
};

function setCatalogDebug(operation: string, status: CatalogDebugState["status"], message: string | null) {
  const providerDebug = getPokemonTcgDebugInfo();
  catalogDebugState.operation = operation;
  catalogDebugState.status = status;
  catalogDebugState.message = message;
  catalogDebugState.requestUrl = providerDebug.lastRequestUrl;
  catalogDebugState.statusCode = providerDebug.lastStatus;
  catalogDebugState.baseUrl = providerDebug.baseUrl;
  catalogDebugState.isNativeCapacitor = providerDebug.isNativeCapacitor;
  catalogDebugState.isUsingBackendProxy = providerDebug.isUsingBackendProxy;
  catalogDebugState.hasApiBaseUrl = providerDebug.hasApiBaseUrl;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown catalog error";
}

export function getCatalogDebugState() {
  return { ...catalogDebugState };
}

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
      setCatalogDebug("searchCards", cards.length > 0 ? "success" : "empty", cards.length > 0 ? null : "Search returned an empty response.");
      return cards;
    } catch (error) {
      setCatalogDebug("searchCards", "fallback", `Live card search failed. Showing fallback data. ${getErrorMessage(error)}`);
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
      setCatalogDebug("getCardById", "success", null);
      return card;
    } catch (error) {
      setCatalogDebug("getCardById", "fallback", `Live card lookup failed. Showing fallback data if available. ${getErrorMessage(error)}`);
      return fallbackGetCardById(id);
    }
  },

  async getSets(pagination) {
    try {
      const sets = (await fetchPokemonSets(pagination)).map(normalizePokemonSet);
      cacheSets(sets);
      setCatalogDebug("getSets", sets.length > 0 ? "success" : "empty", sets.length > 0 ? null : "Set catalog returned an empty response.");
      return sets;
    } catch (error) {
      const fallbackSets = await mockCardService.getSets(pagination);
      setCatalogDebug("getSets", "fallback", `Set catalog API failed. Showing fallback sets. ${getErrorMessage(error)}`);
      return fallbackSets;
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
      setCatalogDebug("getSetById", "success", null);
      return set;
    } catch (error) {
      setCatalogDebug("getSetById", "fallback", `Set lookup API failed. Showing fallback set if available. ${getErrorMessage(error)}`);
      return mockCardService.getSetById(setId);
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
      setCatalogDebug("getCardsBySet", cards.length > 0 ? "success" : "empty", cards.length > 0 ? null : "Set cards returned an empty response.");
      return cards;
    } catch (error) {
      const fallbackCards = await mockCardService.getCardsBySet(setId, pagination);
      setCatalogDebug("getCardsBySet", "fallback", `Set cards API failed. Showing fallback cards if available. ${getErrorMessage(error)}`);
      return fallbackCards;
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
