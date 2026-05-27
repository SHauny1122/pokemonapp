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

    return Response.json(
      {
        error: "Pokemon TCG API proxy request failed.",
        detail: message,
      },
      { headers: corsHeaders, status: 502 }
    );
  }
}
