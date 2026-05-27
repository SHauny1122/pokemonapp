import { NextRequest } from "next/server";

const POKEMON_TCG_API_BASE_URL = "https://api.pokemontcg.io/v2";
const UPSTREAM_TIMEOUT_MS = 20000;

export const dynamic = "force-static";

const allowedRoots = new Set(["cards", "sets"]);
const allowedOrigins = new Set([
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "https://pokemonapp-rho.vercel.app",
]);

const fallbackSets = [
  {
    id: "base1",
    name: "Base",
    series: "Base",
    printedTotal: 102,
    total: 102,
    ptcgoCode: "BS",
    releaseDate: "1999/01/09",
    images: {
      symbol: "https://images.pokemontcg.io/base1/symbol.png",
      logo: "https://images.pokemontcg.io/base1/logo.png",
    },
  },
  {
    id: "neo1",
    name: "Neo Genesis",
    series: "Neo",
    printedTotal: 111,
    total: 111,
    ptcgoCode: "N1",
    releaseDate: "2000/12/16",
    images: {
      symbol: "https://images.pokemontcg.io/neo1/symbol.png",
      logo: "https://images.pokemontcg.io/neo1/logo.png",
    },
  },
  {
    id: "ecard3",
    name: "Skyridge",
    series: "E-Card",
    printedTotal: 144,
    total: 182,
    ptcgoCode: "SK",
    releaseDate: "2003/05/12",
    images: {
      symbol: "https://images.pokemontcg.io/ecard3/symbol.png",
      logo: "https://images.pokemontcg.io/ecard3/logo.png",
    },
  },
];

const fallbackCards = [
  {
    id: "base1-4",
    name: "Charizard",
    number: "4",
    rarity: "Rare Holo",
    supertype: "Pokemon",
    types: ["Fire"],
    images: {
      small: "https://images.pokemontcg.io/base1/4.png",
      large: "https://images.pokemontcg.io/base1/4_hires.png",
    },
    set: fallbackSets[0],
    tcgplayer: { prices: { holofoil: { market: 920, mid: 710, high: 1100, low: 600 } } },
  },
  {
    id: "base1-2",
    name: "Blastoise",
    number: "2",
    rarity: "Rare Holo",
    supertype: "Pokemon",
    types: ["Water"],
    images: {
      small: "https://images.pokemontcg.io/base1/2.png",
      large: "https://images.pokemontcg.io/base1/2_hires.png",
    },
    set: fallbackSets[0],
    tcgplayer: { prices: { holofoil: { market: 410, mid: 390, high: 520, low: 260 } } },
  },
  {
    id: "base1-15",
    name: "Venusaur",
    number: "15",
    rarity: "Rare Holo",
    supertype: "Pokemon",
    types: ["Grass"],
    images: {
      small: "https://images.pokemontcg.io/base1/15.png",
      large: "https://images.pokemontcg.io/base1/15_hires.png",
    },
    set: fallbackSets[0],
    tcgplayer: { prices: { holofoil: { market: 325, mid: 350, high: 440, low: 220 } } },
  },
  {
    id: "neo1-9",
    name: "Lugia",
    number: "9",
    rarity: "Rare Holo",
    supertype: "Pokemon",
    types: ["Psychic"],
    images: {
      small: "https://images.pokemontcg.io/neo1/9.png",
      large: "https://images.pokemontcg.io/neo1/9_hires.png",
    },
    set: fallbackSets[1],
    tcgplayer: { prices: { holofoil: { market: 640, mid: 560, high: 820, low: 420 } } },
  },
  {
    id: "ecard3-146",
    name: "Rayquaza",
    number: "146",
    rarity: "Rare Holo",
    supertype: "Pokemon",
    types: ["Colorless"],
    images: {
      small: "https://images.pokemontcg.io/ecard3/146.png",
      large: "https://images.pokemontcg.io/ecard3/146_hires.png",
    },
    set: fallbackSets[2],
    tcgplayer: { prices: { holofoil: { market: 1100, mid: 920, high: 1400, low: 760 } } },
  },
];

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

function jsonFallback(data: unknown, corsHeaders: Record<string, string>, detail: string) {
  return Response.json(
    {
      data,
      page: 1,
      pageSize: Array.isArray(data) ? data.length : 1,
      count: Array.isArray(data) ? data.length : 1,
      totalCount: Array.isArray(data) ? data.length : 1,
      fallback: true,
      warning: detail,
    },
    {
      headers: {
        ...corsHeaders,
        "Cache-Control": "no-store",
      },
    }
  );
}

function getFallbackResponse(path: string[], search: string, corsHeaders: Record<string, string>, detail: string) {
  const [root, id] = path;

  if (root === "sets" && id) {
    return jsonFallback(fallbackSets.find((set) => set.id === id) ?? fallbackSets[0], corsHeaders, detail);
  }

  if (root === "sets") {
    return jsonFallback(fallbackSets, corsHeaders, detail);
  }

  if (root === "cards" && id) {
    return jsonFallback(fallbackCards.find((card) => card.id === id) ?? fallbackCards[0], corsHeaders, detail);
  }

  if (root === "cards") {
    const setId = new URLSearchParams(search).get("q")?.match(/set\.id:([a-z0-9-]+)/i)?.[1];
    const cards = setId ? fallbackCards.filter((card) => card.set.id === setId) : fallbackCards;
    return jsonFallback(cards.length > 0 ? cards : fallbackCards, corsHeaders, detail);
  }

  return null;
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
      postExample: { path: "/sets?page=1&pageSize=1&q=ptcgoCode%3A*" },
    },
    { headers: getCorsHeaders(request) }
  );
}

type PokemonTcgProxyRequestBody = {
  path?: string;
};

export async function POST(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  let body: PokemonTcgProxyRequestBody;

  try {
    body = (await request.json()) as PokemonTcgProxyRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { headers: corsHeaders, status: 400 });
  }

  const rawPath = body.path ?? "";
  const [rawPathname, rawSearch = ""] = rawPath.split("?");
  const path = rawPathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const [root] = path;

  if (!root || !allowedRoots.has(root)) {
    return Response.json({ error: "Unsupported Pokemon TCG endpoint." }, { headers: corsHeaders, status: 400 });
  }

  const targetUrl = new URL(`${POKEMON_TCG_API_BASE_URL}/${path.map(encodeURIComponent).join("/")}`);
  new URLSearchParams(rawSearch).forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

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
    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Cache-Control": response.ok ? "public, s-maxage=3600, stale-while-revalidate=86400" : "no-store",
        "Content-Type": response.headers.get("Content-Type") ?? "application/json",
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
