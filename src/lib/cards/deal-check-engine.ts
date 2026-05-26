import { Card, DealCheckResult, DealPriceSource, DealVerdict } from "@/lib/cards/types";

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

function getPriceSources(card: Card): DealPriceSource[] {
  const hasTcgplayer = Boolean(card.tcgplayerPrices && Object.keys(card.tcgplayerPrices).length > 0);
  const hasCardmarket = Boolean(
    card.cardmarketPrices &&
      (card.cardmarketPrices.market !== undefined ||
        card.cardmarketPrices.mid !== undefined ||
        card.cardmarketPrices.low !== undefined)
  );

  const sources: DealPriceSource[] = [];

  if (hasTcgplayer) {
    sources.push("tcgplayer-pokemon-tcg-api");
  }

  if (hasCardmarket) {
    sources.push("cardmarket-pokemon-tcg-api");
  }

  return sources;
}

function getVerdictFromPriceGap(priceGapPercent: number): DealVerdict {
  if (priceGapPercent <= -25) {
    return "STRONG BUY";
  }

  if (priceGapPercent <= -8) {
    return "GOOD DEAL";
  }

  if (priceGapPercent >= 25) {
    return "AVOID";
  }

  if (priceGapPercent >= 8) {
    return "OVERPRICED";
  }

  return "FAIR PRICE";
}

function getConfidenceForSources(sourceCount: number) {
  if (sourceCount >= 2) {
    return 72;
  }

  if (sourceCount === 1) {
    return 58;
  }

  return 45;
}

function getExplanation(verdict: DealVerdict, differencePercent: number) {
  if (verdict === "STRONG BUY") {
    return `Seller price is ${Math.abs(differencePercent).toFixed(1)}% below the current market price. This looks unusually favorable, but still check condition and seller trust.`;
  }

  if (verdict === "GOOD DEAL") {
    return `Seller price is ${Math.abs(differencePercent).toFixed(1)}% below the current market price. This may be a good buy if the card condition checks out.`;
  }

  if (verdict === "OVERPRICED") {
    return `Seller price is ${differencePercent.toFixed(1)}% above the current market price. You may want to negotiate or compare other listings.`;
  }

  if (verdict === "AVOID") {
    return `Seller price is ${differencePercent.toFixed(1)}% above the current market price. This looks too expensive based on available pricing data.`;
  }

  return "Seller price is close to the current market price. This looks fair, assuming the card condition matches the listing.";
}

export function evaluateDealCheck(card: Card, askingPrice: number): DealCheckResult | undefined {
  const hasLiveCard = card.dataSource === "pokemon-tcg-api";
  const marketPrice = card.marketValue;

  if (!Number.isFinite(askingPrice) || askingPrice <= 0 || !hasLiveCard || marketPrice === null || marketPrice <= 0) {
    return undefined;
  }

  const priceSources = getPriceSources(card);

  if (priceSources.length === 0) {
    return undefined;
  }

  const differencePercent = roundToCents(((askingPrice - marketPrice) / marketPrice) * 100);
  const verdict = getVerdictFromPriceGap(differencePercent);
  const confidence = getConfidenceForSources(priceSources.length);

  const missingDataWarnings = [
    "Not enough data for recent sold prices.",
    "Trend unavailable until historical sold data is connected.",
    "Connect more pricing data sources for stronger confidence.",
  ];

  return {
    card,
    askingPrice,
    marketPrice,
    differencePercent,
    verdict,
    explanation: getExplanation(verdict, differencePercent),
    confidence,
    confidenceNote:
      priceSources.length > 1
        ? "Live market prices are available from multiple sources, but sold-history signals are still unavailable."
        : "Only one live pricing source is available. Confidence is conservative until more sources are connected.",
    dataQuality: priceSources.length > 1 ? "live-data" : "limited-data",
    priceSources,
    lastUpdated: card.priceUpdatedAt,
    missingDataWarnings,
    unavailableMetrics: [
      "Recent sold prices",
      "30-day trend",
      "Volatility",
      "Liquidity",
      "Demand score",
      "Market pulse",
      "Charts",
    ],
  };
}
