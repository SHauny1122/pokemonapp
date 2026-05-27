import { CardPagination } from "@/lib/cards/types";
import { PokemonTCGProvider } from "@/lib/cards/providers/provider-interfaces";

const POKEMON_TCG_API_BASE_URL = "https://api.pokemontcg.io/v2";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "");
const DEFAULT_SEARCH_PAGE_SIZE = 24;
const DEFAULT_SET_CARDS_PAGE_SIZE = 50;
const DEFAULT_SETS_PAGE_SIZE = 80;
const MAX_PAGE_SIZE = 250;

type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

type PokemonTcgDebugInfo = {
  baseUrl: string;
  lastRequestUrl: string | null;
  lastStatus: number | null;
  lastError: string | null;
  isNativeCapacitor: boolean;
  isUsingBackendProxy: boolean;
  hasApiBaseUrl: boolean;
};

const pokemonTcgDebugInfo: PokemonTcgDebugInfo = {
  baseUrl: "",
  lastRequestUrl: null,
  lastStatus: null,
  lastError: null,
  isNativeCapacitor: false,
  isUsingBackendProxy: false,
  hasApiBaseUrl: Boolean(API_BASE_URL),
};

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

function isNativeCapacitorRuntime() {
  if (typeof window === "undefined") {
    return false;
  }

  const capacitor = (window as CapacitorWindow).Capacitor;

  return Boolean(capacitor?.isNativePlatform?.());
}

function getPokemonTcgRequestBaseUrl() {
  if (API_BASE_URL) {
    return `${API_BASE_URL}/api/pokemon-tcg`;
  }

  return POKEMON_TCG_API_BASE_URL;
}

function getPokemonTcgRequestUrl(path: string) {
  if (!API_BASE_URL) {
    return `${POKEMON_TCG_API_BASE_URL}${path}`;
  }

  return `${API_BASE_URL}/api/pokemon-tcg`;
}

export function getPokemonTcgDebugInfo() {
  return {
    ...pokemonTcgDebugInfo,
    baseUrl: getPokemonTcgRequestBaseUrl(),
    hasApiBaseUrl: Boolean(API_BASE_URL),
    isNativeCapacitor: isNativeCapacitorRuntime(),
    isUsingBackendProxy: Boolean(API_BASE_URL),
  };
}

async function fetchPokemonTcgJson<T>(path: string) {
  const requestUrl = getPokemonTcgRequestUrl(path);
  pokemonTcgDebugInfo.baseUrl = getPokemonTcgRequestBaseUrl();
  pokemonTcgDebugInfo.lastRequestUrl = requestUrl;
  pokemonTcgDebugInfo.lastStatus = null;
  pokemonTcgDebugInfo.lastError = null;
  pokemonTcgDebugInfo.isNativeCapacitor = isNativeCapacitorRuntime();
  pokemonTcgDebugInfo.isUsingBackendProxy = Boolean(API_BASE_URL);
  pokemonTcgDebugInfo.hasApiBaseUrl = Boolean(API_BASE_URL);

  const response = await fetch(
    requestUrl,
    API_BASE_URL
      ? {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path }),
        }
      : {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          next: { revalidate: 3600 },
        }
  );

  pokemonTcgDebugInfo.lastStatus = response.status;

  if (!response.ok) {
    pokemonTcgDebugInfo.lastError = `Pokemon TCG API request failed with ${response.status}`;
    throw new Error(pokemonTcgDebugInfo.lastError);
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    pokemonTcgDebugInfo.lastError = error instanceof Error ? error.message : "Invalid Pokemon TCG API JSON response";
    throw error;
  }
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
    const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgSetRecord[]>>(
      `/sets?page=${page}&pageSize=${pageSize}`
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
