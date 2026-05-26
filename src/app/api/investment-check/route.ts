import { NextRequest } from "next/server";
import { analyzeInvestmentCheck } from "@/lib/cards/investment-check";
import { getCardById } from "@/lib/cards/card-service";
import {
  fetchJustTcgInvestmentData,
  hasJustTcgApiKey,
} from "@/lib/cards/providers/justtcg-provider";
import { convertCurrencyToUsd } from "@/lib/currency/format";
import { DEFAULT_CURRENCY_CODE, isSupportedCurrencyCode } from "@/lib/currency/exchange-rates";

type InvestmentCheckRequestBody = {
  cardId?: string;
  purchasePrice?: number;
  currencyCode?: string;
  condition?: string;
  printing?: string;
  variantId?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

function isInvestmentDebugEnabled() {
  return process.env.DEBUG_INVESTMENT_CHECK === "true";
}

function debugInvestmentCheck(message: string, payload?: Record<string, unknown>) {
  if (!isInvestmentDebugEnabled()) {
    return;
  }

  console.info(`[InvestmentCheck] ${message}`, payload ?? {});
}

export function OPTIONS() {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  });
}

export async function POST(request: NextRequest) {
  let body: InvestmentCheckRequestBody;

  try {
    body = (await request.json()) as InvestmentCheckRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { headers: corsHeaders, status: 400 });
  }

  const cardId = body.cardId?.trim();
  const purchasePrice = typeof body.purchasePrice === "number" ? body.purchasePrice : Number(body.purchasePrice);
  const requestedCurrencyCode = body.currencyCode ?? "";
  const currencyCode = isSupportedCurrencyCode(requestedCurrencyCode) ? requestedCurrencyCode : DEFAULT_CURRENCY_CODE;

  if (!cardId) {
    return Response.json({ error: "cardId is required." }, { headers: corsHeaders, status: 400 });
  }

  if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
    return Response.json({ error: "purchasePrice must be a positive number." }, { headers: corsHeaders, status: 400 });
  }

  const card = await getCardById(cardId);

  if (!card) {
    return Response.json({ error: "Card not found." }, { headers: corsHeaders, status: 404 });
  }

  const purchasePriceUsd = convertCurrencyToUsd(purchasePrice, currencyCode);
  const isProviderConfigured = hasJustTcgApiKey();

  debugInvestmentCheck("API route received request", {
    hasJustTcgApiKey: isProviderConfigured,
    selectedCard: {
      id: card.id,
      name: card.name,
      set: card.set,
      number: card.number,
      condition: body.condition ?? null,
      printing: body.printing ?? null,
      variantId: body.variantId ?? null,
    },
  });

  try {
    const providerData = isProviderConfigured
      ? await fetchJustTcgInvestmentData(card, {
          condition: body.condition,
          printing: body.printing,
          variantId: body.variantId,
        })
      : undefined;

    debugInvestmentCheck("Analysis data selected", {
      providerUsed: providerData?.provider ?? "none",
      hasPriceHistory: Boolean(providerData?.priceHistory.length),
      pricePointCount: providerData?.priceHistory.length ?? 0,
      hasListings: Boolean(providerData?.activeListings?.length),
      listingCount: providerData?.activeListings?.length ?? 0,
      hasSoldComps: Boolean(providerData?.recentSales.length),
      soldCompCount: providerData?.recentSales.length ?? 0,
    });

    return Response.json(
      analyzeInvestmentCheck({
        card,
        purchasePriceUsd,
        providerData,
        isProviderConfigured,
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    debugInvestmentCheck("Provider fetch failed", {
      providerUsed: "none",
      error: error instanceof Error ? error.message : "Unknown provider error",
      hasJustTcgApiKey: isProviderConfigured,
    });

    return Response.json(
      analyzeInvestmentCheck({
        card,
        purchasePriceUsd,
        isProviderConfigured,
      }),
      { headers: corsHeaders }
    );
  }
}
