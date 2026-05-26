import {
  InvestmentMarketData,
  InvestmentListing,
  InvestmentPricePoint,
  InvestmentRecentSale,
} from "@/lib/cards/investment-check";
import { Card } from "@/lib/cards/types";

const JUSTTCG_API_BASE_URL = "https://api.justtcg.com/v1";

type JustTcgResponse<T> = {
  data?: T;
  error?: string;
  code?: string;
};

type JustTcgCard = {
  id: string;
  name: string;
  game: string;
  set: string;
  set_name?: string;
  number: string | null;
  rarity: string | null;
  variants?: JustTcgVariant[];
};

type JustTcgVariant = {
  id: string;
  condition?: string | null;
  printing?: string | null;
  language?: string | null;
  price?: number | null;
  lastUpdated?: number | null;
  priceChange7d?: number | null;
  priceChange30d?: number | null;
  priceChange90d?: number | null;
  avgPrice?: number | null;
  avgPrice30d?: number | null;
  avgPrice90d?: number | null;
  priceHistory?: JustTcgPriceHistoryEntry[] | null;
  priceHistory30d?: JustTcgPriceHistoryEntry[] | null;
  minPrice7d?: number | null;
  maxPrice7d?: number | null;
  minPrice30d?: number | null;
  maxPrice30d?: number | null;
  minPrice90d?: number | null;
  maxPrice90d?: number | null;
  stddevPopPrice7d?: number | null;
  stddevPopPrice30d?: number | null;
  stddevPopPrice90d?: number | null;
  covPrice7d?: number | null;
  covPrice30d?: number | null;
  covPrice90d?: number | null;
  trendSlope7d?: number | null;
  trendSlope30d?: number | null;
  trendSlope90d?: number | null;
  priceChangesCount7d?: number | null;
  priceChangesCount30d?: number | null;
  priceChangesCount90d?: number | null;
};

type JustTcgPriceHistoryEntry = {
  t: number;
  p: number;
};

type JustTcgInvestmentSearchOptions = {
  condition?: string;
  printing?: string;
  variantId?: string;
};

function getJustTcgApiKey() {
  return process.env.JUSTTCG_API_KEY;
}

export function hasJustTcgApiKey() {
  return Boolean(getJustTcgApiKey());
}

function isInvestmentDebugEnabled() {
  return process.env.DEBUG_INVESTMENT_CHECK === "true";
}

function debugInvestmentCheck(message: string, payload?: Record<string, unknown>) {
  if (!isInvestmentDebugEnabled()) {
    return;
  }

  console.info(`[InvestmentCheck] ${message}`, payload ?? {});
}

async function fetchJustTcg<T>(path: string) {
  const apiKey = getJustTcgApiKey();

  if (!apiKey) {
    throw new Error("Missing JUSTTCG_API_KEY");
  }

  const response = await fetch(`${JUSTTCG_API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey,
    },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`JustTCG request failed with ${response.status}`);
  }

  const payload = (await response.json()) as JustTcgResponse<T>;

  if (payload.error) {
    throw new Error(`JustTCG error: ${payload.error}`);
  }

  return payload.data;
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : undefined;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/pokemon|pokémon|tcg|scarlet & violet|sword & shield|sun & moon/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeCardNumber(value: string | null | undefined) {
  const primaryNumber = (value ?? "").split("/")[0];

  return primaryNumber.toLowerCase().replace(/^0+/, "").replace(/[^a-z0-9]/g, "");
}

function scoreCardMatch(card: Card, candidate: JustTcgCard) {
  let score = 0;
  const cardName = normalizeText(card.name);
  const candidateName = normalizeText(candidate.name);
  const cardSet = normalizeText(card.set);
  const candidateSet = normalizeText(candidate.set_name ?? candidate.set);
  const cardNumber = normalizeCardNumber(card.number);
  const candidateNumber = normalizeCardNumber(candidate.number);

  if (candidateName === cardName) {
    score += 8;
  } else if (candidateName.includes(cardName) || cardName.includes(candidateName)) {
    score += 3;
  }

  if (cardNumber && candidateNumber && candidateNumber === cardNumber) {
    score += 6;
  }

  if (candidateSet === cardSet) {
    score += 8;
  } else if (candidateSet.includes(cardSet) || cardSet.includes(candidateSet)) {
    score += 3;
  }

  if (!cardSet.includes("shadowless") && candidateSet.includes("shadowless")) {
    score -= 4;
  }

  if (cardSet.includes("shadowless") && !candidateSet.includes("shadowless")) {
    score -= 4;
  }

  return score;
}

function chooseBestCard(card: Card, candidates: JustTcgCard[]) {
  return [...candidates].sort((a, b) => scoreCardMatch(card, b) - scoreCardMatch(card, a))[0];
}

function scoreVariant(variant: JustTcgVariant) {
  let score = 0;
  const condition = normalizeText(variant.condition);
  const printing = normalizeText(variant.printing);

  if (condition === "near mint" || condition === "nm") {
    score += 8;
  }

  if (printing.includes("normal") || printing.includes("regular")) {
    score += 3;
  }

  if (!printing.includes("foil") && !printing.includes("holo") && !printing.includes("reverse")) {
    score += 2;
  }

  if (toNumber(variant.price)) {
    score += 4;
  }

  return score;
}

function choosePreferredVariant(variants: JustTcgVariant[], options?: JustTcgInvestmentSearchOptions) {
  const requestedVariantId = normalizeText(options?.variantId);
  const requestedCondition = normalizeText(options?.condition);
  const requestedPrinting = normalizeText(options?.printing);

  return [...variants]
    .filter((variant) => toNumber(variant.price))
    .sort((a, b) => {
      const scoreWithRequest = (variant: JustTcgVariant) => {
        let score = scoreVariant(variant);
        const variantId = normalizeText(variant.id);
        const condition = normalizeText(variant.condition);
        const printing = normalizeText(variant.printing);

        if (requestedVariantId && variantId === requestedVariantId) {
          score += 20;
        }

        if (requestedCondition && condition === requestedCondition) {
          score += 8;
        }

        if (requestedPrinting && printing === requestedPrinting) {
          score += 6;
        }

        return score;
      };

      return scoreWithRequest(b) - scoreWithRequest(a);
    })[0];
}

function normalizeHistory(entries: JustTcgPriceHistoryEntry[] | null | undefined) {
  return (entries ?? [])
    .map<InvestmentPricePoint | null>((entry) => {
      const valueUsd = toNumber(entry.p);

      if (!valueUsd || !Number.isFinite(entry.t)) {
        return null;
      }

      return {
        date: new Date(entry.t * 1000).toISOString().slice(0, 10),
        valueUsd,
      };
    })
    .filter((entry): entry is InvestmentPricePoint => Boolean(entry))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getAverageVariantPrice(variants: JustTcgVariant[]) {
  const prices = variants.map((variant) => toNumber(variant.price)).filter((price): price is number => Boolean(price));

  if (prices.length === 0) {
    return undefined;
  }

  return Math.round((prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100) / 100;
}

function getVariantPricingWarnings(variant: JustTcgVariant) {
  const warnings: string[] = [];
  const priceChange7d = variant.priceChange7d ?? 0;
  const priceChange30d = variant.priceChange30d ?? 0;
  const priceChange90d = variant.priceChange90d ?? 0;
  const volatility = variant.covPrice30d ?? variant.covPrice90d ?? variant.covPrice7d;
  const priceChanges = variant.priceChangesCount30d ?? variant.priceChangesCount90d ?? variant.priceChangesCount7d;

  if (Math.abs(priceChange7d) >= 20 || Math.abs(priceChange30d) >= 30) {
    warnings.push("Recent price movement is sharp, so verify comps before buying.");
  }

  if (priceChange7d > 15 && priceChange30d < 0) {
    warnings.push("Short-term price action may be a bounce inside a weaker 30-day trend.");
  }

  if (priceChange90d < -15) {
    warnings.push("The 90-day trend is negative.");
  }

  if (typeof volatility === "number" && volatility >= 0.25) {
    warnings.push("Recent pricing looks choppy.");
  }

  if (typeof priceChanges === "number" && priceChanges <= 1) {
    warnings.push("Recent price observations are limited for this variant.");
  }

  return warnings;
}

function getListingsFromVariants(variants: JustTcgVariant[]) {
  return variants
    .map<InvestmentListing | null>((variant) => {
      const priceUsd = toNumber(variant.price);

      if (!priceUsd) {
        return null;
      }

      return {
        source: "Market listing",
        priceUsd,
        condition: variant.condition ?? undefined,
        printing: variant.printing ?? undefined,
        title: [variant.printing, variant.condition].filter(Boolean).join(" / ") || undefined,
      };
    })
    .filter((listing): listing is InvestmentListing => Boolean(listing))
    .sort((a, b) => a.priceUsd - b.priceUsd)
    .slice(0, 8);
}

function getPriceRange(values: Array<number | undefined>) {
  const clean = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value > 0);

  if (clean.length === 0) {
    return undefined;
  }

  const total = clean.reduce((sum, value) => sum + value, 0);

  return {
    lowUsd: Math.round(Math.min(...clean) * 100) / 100,
    averageUsd: Math.round((total / clean.length) * 100) / 100,
    highUsd: Math.round(Math.max(...clean) * 100) / 100,
  };
}

export async function fetchJustTcgInvestmentData(
  card: Card,
  options?: JustTcgInvestmentSearchOptions
): Promise<InvestmentMarketData> {
  const searchParams = new URLSearchParams({
    game: "Pokemon",
    q: card.name,
    number: card.number,
    limit: "10",
    include_price_history: "true",
    priceHistoryDuration: "90d",
    include_statistics: "7d,30d,90d",
  });

  if (options?.condition) {
    searchParams.set("condition", options.condition);
  }

  if (options?.printing) {
    searchParams.set("printing", options.printing);
  }

  if (options?.variantId) {
    searchParams.set("variantId", options.variantId);
  }

  debugInvestmentCheck("Calling JustTCG", {
    provider: "JustTCG",
    selectedCard: {
      id: card.id,
      name: card.name,
      set: card.set,
      number: card.number,
      condition: options?.condition ?? null,
      printing: options?.printing ?? null,
      variantId: options?.variantId ?? null,
    },
  });

  const cards = await fetchJustTcg<JustTcgCard[]>(`/cards?${searchParams.toString()}`);
  const matchedCard = chooseBestCard(card, cards ?? []);
  const variants = matchedCard?.variants ?? [];
  const preferredVariant = choosePreferredVariant(variants, options);

  if (!matchedCard || !preferredVariant) {
    throw new Error("No matching JustTCG card variant found");
  }

  const priceHistory = normalizeHistory(preferredVariant.priceHistory ?? preferredVariant.priceHistory30d);
  const recentSales: InvestmentRecentSale[] = [];
  const activeListings = getListingsFromVariants(variants);
  const currentMarketPriceUsd = toNumber(preferredVariant.price);
  const averageSoldPriceUsd =
    toNumber(preferredVariant.avgPrice30d) ?? toNumber(preferredVariant.avgPrice90d) ?? toNumber(preferredVariant.avgPrice);
  const listingRange = getPriceRange(activeListings.map((listing) => listing.priceUsd));
  const soldRange = getPriceRange(recentSales.map((sale) => sale.priceUsd));

  debugInvestmentCheck("JustTCG response mapped", {
    provider: "JustTCG",
    selectedCard: {
      id: card.id,
      name: card.name,
      set: card.set,
      number: card.number,
    },
    matchedCard: {
      id: matchedCard.id,
      name: matchedCard.name,
      set: matchedCard.set_name ?? matchedCard.set,
      number: matchedCard.number,
      score: scoreCardMatch(card, matchedCard),
    },
    preferredVariant: {
      id: preferredVariant.id,
      condition: preferredVariant.condition ?? null,
      printing: preferredVariant.printing ?? null,
      hasCurrentPrice: Boolean(currentMarketPriceUsd),
    },
    hasPriceHistory: priceHistory.length > 0,
    pricePointCount: priceHistory.length,
    hasListings: activeListings.length > 0,
    listingCount: activeListings.length,
    hasSoldComps: recentSales.length > 0,
    soldCompCount: recentSales.length,
  });

  return {
    provider: "JustTCG",
    currentMarketPriceUsd,
    averageSoldPriceUsd,
    recentSales,
    activeListings,
    listingRange,
    soldRange,
    priceHistory,
    gradedPrices: variants
      .map((variant) => {
        const valueUsd = toNumber(variant.price);
        const label = [variant.printing, variant.condition].filter(Boolean).join(" / ");

        return valueUsd && label ? { label, valueUsd } : null;
      })
      .filter((price): price is { label: string; valueUsd: number } => Boolean(price))
      .slice(0, 8),
    warnings: [
      ...getVariantPricingWarnings(preferredVariant),
      ...(currentMarketPriceUsd ? [] : ["Current market price is unavailable for the selected variant."]),
      ...(priceHistory.length > 1 ? [] : ["Price history is limited for this card."]),
      ...(averageSoldPriceUsd ? [] : ["Recent average pricing is unavailable for this card."]),
      ...(scoreCardMatch(card, matchedCard) < 12
        ? ["Match confidence is limited; confirm the set and card number before buying."]
        : []),
      `Variant used: ${[preferredVariant.printing, preferredVariant.condition].filter(Boolean).join(" / ") || "best available priced variant"}.`,
      ...(variants.length > 1 ? [`${variants.length} condition/printing variants found.`] : []),
      ...(getAverageVariantPrice(variants)
        ? [`Average variant listing price is $${getAverageVariantPrice(variants)?.toFixed(2)}.`]
        : []),
    ],
  };
}
