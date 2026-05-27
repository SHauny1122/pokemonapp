import { NextRequest } from "next/server";
import { getSeedCardsBySet, seedCards, seedSets } from "@/lib/cards/seed-catalog";
import type { Card, CardSet } from "@/lib/cards/types";

const POKEMON_TCG_API_BASE_URL = "https://api.pokemontcg.io/v2";
const UPSTREAM_TIMEOUT_MS = 2500;
const SET_CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=604800";
const CARD_CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";
const FALLBACK_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=86400";

export const dynamic = "force-static";

const allowedRoots = new Set(["cards", "sets"]);
const allowedOrigins = new Set([
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "https://pokemonapp-rho.vercel.app",
]);

type ProxyCacheEntry = {
  body: string;
  contentType: string;
  expiresAt: number;
  status: number;
  cacheControl: string;
};

const proxyCache = ((globalThis as typeof globalThis & { __pokemonTcgProxyCache?: Map<string, ProxyCacheEntry> })
  .__pokemonTcgProxyCache ??= new Map<string, ProxyCacheEntry>());

function getCorsHeaders(request?: NextRequest) {
  const origin = request?.headers.get("origin") ?? "";
  const allowedOrigin =
    allowedOrigins.has(origin) || origin.startsWith("capacitor://") || origin.startsWith("ionic://")
      ? origin
      : "*";

  return {
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function getCacheControl(root: string) {
  return root === "sets" ? SET_CACHE_CONTROL : CARD_CACHE_CONTROL;
}

function getInMemoryTtlMs(root: string) {
  return root === "sets" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
}

function toPokemonSet(set: CardSet) {
  return {
    id: set.id,
    name: set.name,
    series: set.era,
    printedTotal: set.totalCards,
    total: set.totalCards,
    releaseDate: set.releaseDate,
    images: {
      symbol: set.imageSymbol,
      logo: set.imageLogo,
    },
  };
}

function toPokemonCard(card: Card) {
  const set = seedSets.find((entry) => entry.id === card.setId) ?? seedSets.find((entry) => entry.name === card.set) ?? seedSets[0];
  const prices = card.tcgplayerPrices ?? card.pricing?.variants ?? {};

  return {
    id: card.id,
    name: card.name,
    number: card.number.split("/")[0] ?? card.number,
    rarity: card.rarity,
    supertype: card.supertype ?? "Pokemon",
    types: card.types ?? [card.type],
    images: {
      small: card.imageSmall ?? card.image,
      large: card.imageLarge ?? card.imageSmall ?? card.image,
    },
    set: toPokemonSet(set),
    tcgplayer: {
      prices: Object.keys(prices).length > 0 ? prices : { holofoil: { market: card.marketValue ?? undefined } },
    },
  };
}

function parseRequestPath(rawPath: string) {
  const [rawPathname, rawSearch = ""] = rawPath.split("?");
  const path = rawPathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

  return { path, rawSearch };
}

function getPageSlice<T>(items: T[], rawSearch: string) {
  const searchParams = new URLSearchParams(rawSearch);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.max(1, Math.min(250, Number(searchParams.get("pageSize")) || items.length));
  const start = (page - 1) * pageSize;
  const data = items.slice(start, start + pageSize);

  return { data, page, pageSize };
}

function getFallbackCards(rawSearch: string) {
  const searchParams = new URLSearchParams(rawSearch);
  const rawQuery = searchParams.get("q") ?? "";
  const setId = rawQuery.match(/set\.id:([a-z0-9-]+)/i)?.[1];
  const query = rawQuery.replace(/set\.id:[a-z0-9-]+/i, "").trim().toLowerCase();
  let cards = setId ? getSeedCardsBySet(setId) : seedCards;

  if (query) {
    cards = cards.filter((card) =>
      [card.name, card.set, card.number, card.rarity, card.type].join(" ").toLowerCase().includes(query)
    );
  }

  return cards.length > 0 ? cards : seedCards;
}

function jsonDataResponse(
  data: unknown[],
  corsHeaders: Record<string, string>,
  detail: string,
  rawSearch: string,
  cacheControl = FALLBACK_CACHE_CONTROL
) {
  const pageData = getPageSlice(data, rawSearch);

  return Response.json(
    {
      data: pageData.data,
      page: pageData.page,
      pageSize: pageData.pageSize,
      count: pageData.data.length,
      totalCount: data.length,
      fallback: true,
      warning: detail,
    },
    {
      headers: {
        ...corsHeaders,
        "Cache-Control": cacheControl,
        "X-Pokemon-Tcg-Cache": "FALLBACK",
      },
    }
  );
}

function jsonSingleResponse(data: unknown, corsHeaders: Record<string, string>, detail: string) {
  return Response.json(
    {
      data,
      page: 1,
      pageSize: 1,
      count: data ? 1 : 0,
      totalCount: data ? 1 : 0,
      fallback: true,
      warning: detail,
    },
    {
      headers: {
        ...corsHeaders,
        "Cache-Control": FALLBACK_CACHE_CONTROL,
        "X-Pokemon-Tcg-Cache": "FALLBACK",
      },
    }
  );
}

function getFallbackResponse(path: string[], rawSearch: string, corsHeaders: Record<string, string>, detail: string) {
  const [root, id] = path;

  if (root === "sets" && id) {
    const set = seedSets.find((entry) => entry.id === id) ?? seedSets[0];
    return jsonSingleResponse(toPokemonSet(set), corsHeaders, detail);
  }

  if (root === "sets") {
    return jsonDataResponse(seedSets.map(toPokemonSet), corsHeaders, detail, rawSearch, SET_CACHE_CONTROL);
  }

  if (root === "cards" && id) {
    const card = seedCards.find((entry) => entry.id === id) ?? seedCards[0];
    return jsonSingleResponse(toPokemonCard(card), corsHeaders, detail);
  }

  if (root === "cards") {
    return jsonDataResponse(getFallbackCards(rawSearch).map(toPokemonCard), corsHeaders, detail, rawSearch, CARD_CACHE_CONTROL);
  }

  return null;
}

function responseFromCache(entry: ProxyCacheEntry, corsHeaders: Record<string, string>) {
  return new Response(entry.body, {
    headers: {
      ...corsHeaders,
      "Cache-Control": entry.cacheControl,
      "Content-Type": entry.contentType,
      "X-Pokemon-Tcg-Cache": "HIT",
    },
    status: entry.status,
  });
}

async function cacheProxyResponse(cacheKey: string, root: string, response: Response) {
  const clone = response.clone();

  proxyCache.set(cacheKey, {
    body: await clone.text(),
    contentType: clone.headers.get("Content-Type") ?? "application/json",
    status: clone.status,
    cacheControl: clone.headers.get("Cache-Control") ?? getCacheControl(root),
    expiresAt: Date.now() + getInMemoryTtlMs(root),
  });
}

async function proxyPokemonTcgRequest(request: NextRequest, rawPath: string) {
  const corsHeaders = getCorsHeaders(request);
  const { path, rawSearch } = parseRequestPath(rawPath);
  const [root] = path;

  if (!root || !allowedRoots.has(root)) {
    return Response.json({ error: "Unsupported Pokemon TCG endpoint." }, { headers: corsHeaders, status: 400 });
  }

  const targetUrl = new URL(`${POKEMON_TCG_API_BASE_URL}/${path.map(encodeURIComponent).join("/")}`);
  new URLSearchParams(rawSearch).forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  const cacheKey = targetUrl.toString();
  const cached = proxyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return responseFromCache(cached, corsHeaders);
  }

  const searchParams = new URLSearchParams(rawSearch);
  if (root === "cards" && !path[1] && !searchParams.get("q")) {
    const trendingResponse = getFallbackResponse(path, rawSearch, corsHeaders, "Showing cached trending seed cards.");
    if (trendingResponse) {
      await cacheProxyResponse(cacheKey, root, trendingResponse);
      return trendingResponse;
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const apiKey = process.env.POKEMON_TCG_API_KEY;

  if (apiKey) {
    headers["X-Api-Key"] = apiKey;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    let response: Response;

    try {
      response = await fetch(targetUrl, {
        cache: "no-store",
        headers,
        method: "GET",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const body = await response.text();
    if (!response.ok) {
      const fallbackResponse = getFallbackResponse(path, rawSearch, corsHeaders, `Pokemon TCG API returned ${response.status}.`);

      if (fallbackResponse) {
        await cacheProxyResponse(cacheKey, root, fallbackResponse);
        return fallbackResponse;
      }
    }

    const contentType = response.headers.get("Content-Type") ?? "application/json";
    const cacheControl = response.ok ? getCacheControl(root) : "no-store";

    if (response.ok) {
      proxyCache.set(cacheKey, {
        body,
        contentType,
        status: response.status,
        cacheControl,
        expiresAt: Date.now() + getInMemoryTtlMs(root),
      });
    }

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Cache-Control": cacheControl,
        "Content-Type": contentType,
        "X-Pokemon-Tcg-Cache": response.ok ? "MISS" : "BYPASS",
      },
      status: response.status,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `Pokemon TCG API request timed out after ${UPSTREAM_TIMEOUT_MS}ms.`
        : error instanceof Error
          ? error.message
          : "Unknown error";
    const fallbackResponse = getFallbackResponse(path, rawSearch, corsHeaders, message);

    if (fallbackResponse) {
      await cacheProxyResponse(cacheKey, root, fallbackResponse);
      return fallbackResponse;
    }

    return Response.json(
      {
        error: "Pokemon TCG API proxy request failed.",
        detail: message,
      },
      { headers: corsHeaders, status: 502 }
    );
  }
}

export function OPTIONS(request: NextRequest) {
  return new Response(null, {
    headers: getCorsHeaders(request),
    status: 204,
  });
}

export function GET(request: NextRequest) {
  return Response.json(
    {
      ok: true,
      route: "/api/pokemon-tcg",
      methods: ["GET", "POST", "OPTIONS"],
      postExample: { path: "/sets?page=1&pageSize=24" },
      cache: {
        sets: SET_CACHE_CONTROL,
        cards: CARD_CACHE_CONTROL,
        upstreamTimeoutMs: UPSTREAM_TIMEOUT_MS,
        fallbackSets: seedSets.length,
        fallbackCards: seedCards.length,
      },
    },
    { headers: { ...getCorsHeaders(request), "Cache-Control": "no-store" } }
  );
}

type PokemonTcgProxyRequestBody = {
  path?: string;
};

export async function POST(request: NextRequest) {
  let body: PokemonTcgProxyRequestBody;

  try {
    body = (await request.json()) as PokemonTcgProxyRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { headers: getCorsHeaders(request), status: 400 });
  }

  return proxyPokemonTcgRequest(request, body.path ?? "");
}
