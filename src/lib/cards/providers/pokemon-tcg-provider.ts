import { CardPagination } from "@/lib/cards/types";
import { PokemonTCGProvider } from "@/lib/cards/providers/provider-interfaces";

const POKEMON_TCG_API_BASE_URL = "https://api.pokemontcg.io/v2";
const DEFAULT_SEARCH_PAGE_SIZE = 24;
const DEFAULT_SET_CARDS_PAGE_SIZE = 50;
const DEFAULT_SETS_PAGE_SIZE = 80;
const MAX_PAGE_SIZE = 250;

type PokemonTcgCardPrice = {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
};

type PokemonTcgCardAttack = {
  name?: string;
  cost?: string[];
  convertedEnergyCost?: number;
  damage?: string;
  text?: string;
};

type PokemonTcgCardWeakness = {
  type?: string;
  value?: string;
};

type PokemonTcgCardmarketPrices = {
  averageSellPrice?: number;
  lowPrice?: number;
  trendPrice?: number;
};

export type PokemonTcgSetRecord = {
  id: string;
  name: string;
  series?: string;
  ptcgoCode?: string;
  releaseDate?: string;
  total?: number;
  printedTotal?: number;
  images?: {
    symbol?: string;
    logo?: string;
  };
};

export type PokemonTcgCardRecord = {
  id: string;
  name: string;
  number: string;
  updatedAt?: string;
  rarity?: string;
  supertype?: string;
  artist?: string;
  hp?: string;
  types?: string[];
  attacks?: PokemonTcgCardAttack[];
  weaknesses?: PokemonTcgCardWeakness[];
  images?: {
    small?: string;
    large?: string;
  };
  set: PokemonTcgSetRecord;
  tcgplayer?: {
    prices?: Record<string, PokemonTcgCardPrice | undefined>;
  };
  cardmarket?: {
    prices?: PokemonTcgCardmarketPrices;
  };
};

type PokemonTcgPageMeta = {
  page?: number;
  pageSize?: number;
  count?: number;
  totalCount?: number;
};

type PokemonTcgDataPayload<T> = {
  data: T;
  page?: number;
  pageSize?: number;
  count?: number;
  totalCount?: number;
};

export type PokemonTcgListResponse<T> = {
  data: T[];
  meta: PokemonTcgPageMeta;
};

function clampPage(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function clampPageSize(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(value), 250);
}

async function fetchPokemonTcgJson<T>(path: string) {
  const response = await fetch(`${POKEMON_TCG_API_BASE_URL}${path}`, {
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

export async function searchPokemonCards(rawQuery: string, pagination?: CardPagination) {
  const response = await pokemonTCGProvider.searchCards(rawQuery, pagination);
  return response.data;
}

export async function fetchPokemonCardById(cardId: string) {
  return pokemonTCGProvider.fetchCardById(cardId);
}

export async function fetchPokemonSets(pagination?: CardPagination) {
  if (pagination?.page || pagination?.pageSize) {
    const response = await pokemonTCGProvider.fetchSets(pagination);
    return response.data;
  }

  const pageSize = MAX_PAGE_SIZE;
  const allSets: PokemonTcgSetRecord[] = [];
  let page = 1;
  let totalCount = Number.POSITIVE_INFINITY;

  while (allSets.length < totalCount) {
    const response = await pokemonTCGProvider.fetchSets({ page, pageSize });
    const batch = response.data;
    const safeTotalCount = response.meta.totalCount ?? response.meta.count ?? allSets.length + batch.length;

    allSets.push(...batch);
    totalCount = safeTotalCount;

    if (batch.length === 0 || batch.length < pageSize) {
      break;
    }

    page += 1;
  }

  return allSets;
}

export async function fetchPokemonSetById(setId: string) {
  return pokemonTCGProvider.fetchSetById(setId);
}

export async function fetchPokemonCardsBySet(setId: string, pagination?: CardPagination) {
  if (pagination?.page || pagination?.pageSize) {
    const response = await pokemonTCGProvider.fetchCardsBySet(setId, pagination);
    return response.data;
  }

  const pageSize = MAX_PAGE_SIZE;
  const allCards: PokemonTcgCardRecord[] = [];
  let page = 1;
  let totalCount = Number.POSITIVE_INFINITY;

  while (allCards.length < totalCount) {
    const response = await pokemonTCGProvider.fetchCardsBySet(setId, { page, pageSize });
    const batch = response.data;
    const safeTotalCount = response.meta.totalCount ?? response.meta.count ?? allCards.length + batch.length;

    allCards.push(...batch);
    totalCount = safeTotalCount;

    if (batch.length === 0 || batch.length < pageSize) {
      break;
    }

    page += 1;
  }

  return allCards;
}

export const pokemonTCGProvider: PokemonTCGProvider = {
  async searchCards(rawQuery: string, pagination?: CardPagination) {
  const query = rawQuery.trim();
  const q = query ? `&q=${encodeURIComponent(query)}` : "";
    const page = clampPage(pagination?.page);
    const pageSize = clampPageSize(pagination?.pageSize, DEFAULT_SEARCH_PAGE_SIZE);
  const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgCardRecord[]>>(
      `/cards?page=${page}&pageSize=${pageSize}${q}`
  );

    return {
      data: payload.data,
      meta: {
        page: payload.page,
        pageSize: payload.pageSize,
        count: payload.count,
        totalCount: payload.totalCount,
      },
    };
  },

  async fetchCardById(cardId: string) {
    const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgCardRecord>>(`/cards/${cardId}`);
    return payload.data;
  },

  async fetchSets(pagination?: CardPagination) {
    const page = clampPage(pagination?.page);
    const pageSize = clampPageSize(pagination?.pageSize, DEFAULT_SETS_PAGE_SIZE);
    const englishSetsQuery = encodeURIComponent("ptcgoCode:*");
    const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgSetRecord[]>>(
      `/sets?page=${page}&pageSize=${pageSize}&q=${englishSetsQuery}`
    );

    return {
      data: payload.data,
      meta: {
        page: payload.page,
        pageSize: payload.pageSize,
        count: payload.count,
        totalCount: payload.totalCount,
      },
    };
  },

  async fetchSetById(setId: string) {
    const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgSetRecord>>(`/sets/${setId}`);
    return payload.data;
  },

  async fetchCardsBySet(setId: string, pagination?: CardPagination) {
    const q = encodeURIComponent(`set.id:${setId}`);
    const page = clampPage(pagination?.page);
    const pageSize = clampPageSize(pagination?.pageSize, DEFAULT_SET_CARDS_PAGE_SIZE);
    const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgCardRecord[]>>(
      `/cards?page=${page}&pageSize=${pageSize}&q=${q}`
    );

    return {
      data: payload.data,
      meta: {
        page: payload.page,
        pageSize: payload.pageSize,
        count: payload.count,
        totalCount: payload.totalCount,
      },
    };
  },
};
