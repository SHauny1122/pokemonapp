const POKEMON_TCG_API_BASE_URL = "https://api.pokemontcg.io/v2";

type PokemonTcgCardPrice = {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
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
  releaseDate?: string;
  total?: number;
  printedTotal?: number;
};

export type PokemonTcgCardRecord = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  supertype?: string;
  types?: string[];
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

type PokemonTcgDataPayload<T> = {
  data: T;
};

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

export async function searchPokemonCards(rawQuery: string) {
  const query = rawQuery.trim();
  const q = query ? `&q=${encodeURIComponent(query)}` : "";
  const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgCardRecord[]>>(
    `/cards?pageSize=24${q}`
  );
  return payload.data;
}

export async function fetchPokemonCardById(cardId: string) {
  const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgCardRecord>>(`/cards/${cardId}`);
  return payload.data;
}

export async function fetchPokemonSets() {
  const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgSetRecord[]>>("/sets?pageSize=80");
  return payload.data;
}

export async function fetchPokemonSetById(setId: string) {
  const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgSetRecord>>(`/sets/${setId}`);
  return payload.data;
}

export async function fetchPokemonCardsBySet(setId: string) {
  const q = encodeURIComponent(`set.id:${setId}`);
  const payload = await fetchPokemonTcgJson<PokemonTcgDataPayload<PokemonTcgCardRecord[]>>(
    `/cards?pageSize=50&q=${q}`
  );
  return payload.data;
}
