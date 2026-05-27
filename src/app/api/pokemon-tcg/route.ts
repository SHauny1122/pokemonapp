import { NextRequest } from "next/server";

const POKEMON_TCG_API_BASE_URL = "https://api.pokemontcg.io/v2";

const corsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const allowedRoots = new Set(["cards", "sets"]);

export function OPTIONS() {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  });
}

type PokemonTcgProxyRequestBody = {
  path?: string;
};

export async function POST(request: NextRequest) {
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
    const response = await fetch(targetUrl, {
      headers,
      method: "GET",
      next: { revalidate: 3600 },
    });

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
    return Response.json(
      {
        error: "Pokemon TCG API proxy request failed.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { headers: corsHeaders, status: 502 }
    );
  }
}
