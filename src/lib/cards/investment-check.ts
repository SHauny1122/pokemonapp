import { Card } from "@/lib/cards/types";

export type InvestmentSignal = "Strong Buy" | "Buy" | "Watch" | "Risky" | "Avoid";

export type InvestmentDataQuality = "full" | "partial" | "fallback";

export type InvestmentPricePoint = {
  date: string;
  valueUsd: number;
};

export type InvestmentRecentSale = {
  source: string;
  priceUsd: number;
  date?: string;
  condition?: string;
  grade?: string;
  title?: string;
  url?: string;
};

export type InvestmentListing = {
  source: string;
  priceUsd: number;
  condition?: string;
  printing?: string;
  title?: string;
};

export type InvestmentPriceRange = {
  lowUsd: number | null;
  averageUsd: number | null;
  highUsd: number | null;
};

export type InvestmentMarketData = {
  provider: string;
  currentMarketPriceUsd?: number;
  averageSoldPriceUsd?: number;
  recentSales: InvestmentRecentSale[];
  activeListings?: InvestmentListing[];
  listingRange?: InvestmentPriceRange;
  soldRange?: InvestmentPriceRange;
  priceHistory: InvestmentPricePoint[];
  gradedPrices: {
    label: string;
    valueUsd: number;
  }[];
  warnings: string[];
};

export type InvestmentCheckResponse = {
  card: {
    id: string;
    name: string;
    set: string;
    number: string;
    image?: string;
  };
  signal: InvestmentSignal;
  score: number;
  confidence: number;
  dataQuality: InvestmentDataQuality;
  purchasePriceUsd: number;
  fairValueUsd: number | null;
  trendSummary: string;
  recentSalesSummary: string;
  marketStability: string;
  demandScore: number;
  riskNotes: string[];
  finalExplanation: string;
  sources: string[];
  priceHistory: InvestmentPricePoint[];
  recentSales: InvestmentRecentSale[];
  activeListings: InvestmentListing[];
  listingRange: InvestmentPriceRange | null;
  soldRange: InvestmentPriceRange | null;
  isProviderConfigured: boolean;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function median(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);

  if (clean.length === 0) {
    return null;
  }

  const middle = Math.floor(clean.length / 2);
  return clean.length % 2 === 0 ? round((clean[middle - 1] + clean[middle]) / 2) : round(clean[middle]);
}

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);

  if (clean.length === 0) {
    return null;
  }

  return round(clean.reduce((sum, value) => sum + value, 0) / clean.length);
}

function rangeFromValues(values: number[]): InvestmentPriceRange | null {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);

  if (clean.length === 0) {
    return null;
  }

  return {
    lowUsd: round(clean[0]),
    averageUsd: average(clean),
    highUsd: round(clean[clean.length - 1]),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getSignal(score: number): InvestmentSignal {
  if (score >= 85) {
    return "Strong Buy";
  }

  if (score >= 70) {
    return "Buy";
  }

  if (score >= 50) {
    return "Watch";
  }

  if (score >= 35) {
    return "Risky";
  }

  return "Avoid";
}

function getTrendPercent(history: InvestmentPricePoint[]) {
  const clean = history.filter((point) => Number.isFinite(point.valueUsd) && point.valueUsd > 0);

  if (clean.length < 2) {
    return null;
  }

  const first = clean[0].valueUsd;
  const last = clean[clean.length - 1].valueUsd;

  if (first <= 0) {
    return null;
  }

  return ((last - first) / first) * 100;
}

function getVolatilityPercent(history: InvestmentPricePoint[]) {
  const values = history.map((point) => point.valueUsd).filter((value) => Number.isFinite(value) && value > 0);

  if (values.length < 3) {
    return null;
  }

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;

  if (avg <= 0) {
    return null;
  }

  return (Math.sqrt(variance) / avg) * 100;
}

function describeTrend(trendPercent: number | null, hasProvider: boolean) {
  if (trendPercent === null) {
    return hasProvider ? "Not enough price history yet." : "Not enough price history yet.";
  }

  if (trendPercent >= 12) {
    return `Strong upward trend over the available window (${trendPercent.toFixed(1)}%).`;
  }

  if (trendPercent >= 4) {
    return `Mild upward trend over the available window (${trendPercent.toFixed(1)}%).`;
  }

  if (trendPercent <= -12) {
    return `Downward trend over the available window (${trendPercent.toFixed(1)}%).`;
  }

  if (trendPercent <= -4) {
    return `Softening trend over the available window (${trendPercent.toFixed(1)}%).`;
  }

  return `Mostly flat trend over the available window (${trendPercent.toFixed(1)}%).`;
}

function describeStability(volatilityPercent: number | null, listingRange: InvestmentPriceRange | null) {
  if (volatilityPercent === null) {
    if (listingRange?.lowUsd && listingRange.highUsd && listingRange.averageUsd) {
      const spreadPercent = ((listingRange.highUsd - listingRange.lowUsd) / listingRange.averageUsd) * 100;

      if (spreadPercent <= 18) {
        return "Listing prices are tightly grouped, which suggests a steadier market.";
      }

      if (spreadPercent <= 40) {
        return "Listing prices vary, so compare condition and printing carefully.";
      }

      return "Listing prices are widely spread, so fair value is harder to pin down.";
    }

    return "Market stability is limited until more price history is available.";
  }

  if (volatilityPercent <= 6) {
    return "Stable market with low recent price movement.";
  }

  if (volatilityPercent <= 14) {
    return "Moderate movement. Price is moving, but not wildly.";
  }

  return "Volatile market. Recent prices are moving enough to increase timing risk.";
}

export function analyzeInvestmentCheck({
  card,
  purchasePriceUsd,
  providerData,
  isProviderConfigured,
}: {
  card: Card;
  purchasePriceUsd: number;
  providerData?: InvestmentMarketData;
  isProviderConfigured: boolean;
}): InvestmentCheckResponse {
  const fallbackMarket = card.marketValue && card.marketValue > 0 ? card.marketValue : undefined;
  const salesMedian = median(providerData?.recentSales.map((sale) => sale.priceUsd) ?? []);
  const fairValueUsd = median([
    providerData?.currentMarketPriceUsd,
    providerData?.averageSoldPriceUsd,
    salesMedian ?? undefined,
    fallbackMarket,
  ].filter((value): value is number => typeof value === "number"));
  const priceHistory = providerData?.priceHistory ?? card.history.map((point) => ({ date: point.date, valueUsd: point.value }));
  const trendPercent = getTrendPercent(priceHistory);
  const volatilityPercent = getVolatilityPercent(priceHistory);
  const recentSales = providerData?.recentSales ?? [];
  const activeListings = providerData?.activeListings ?? [];
  const soldRange = providerData?.soldRange ?? rangeFromValues(recentSales.map((sale) => sale.priceUsd));
  const listingRange = providerData?.listingRange ?? rangeFromValues(activeListings.map((listing) => listing.priceUsd));
  const demandScore = clamp(recentSales.length * 12 + activeListings.length * 4, recentSales.length > 0 ? 28 : 15, 95);
  const riskNotes = [...(providerData?.warnings ?? [])];

  let score = 45;

  if (fairValueUsd && fairValueUsd > 0) {
    const discountPercent = ((fairValueUsd - purchasePriceUsd) / fairValueUsd) * 100;
    score += clamp(discountPercent * 1.25, -38, 35);

    if (discountPercent < -20) {
      riskNotes.push("Purchase price is meaningfully above the estimated fair value.");
    } else if (discountPercent > 20) {
      riskNotes.push("Price is well below estimated fair value. Check condition and seller trust before buying.");
    }
  } else {
    riskNotes.push("Fair value could not be estimated from the available provider data.");
    score -= 12;
  }

  if (trendPercent !== null) {
    if (trendPercent >= 12) {
      score += 12;
      riskNotes.push("Recent price movement is strong; avoid chasing a short-term spike without checking comps.");
    } else if (trendPercent >= 4) {
      score += 7;
    } else if (trendPercent <= -12) {
      score -= 14;
      riskNotes.push("Recent trend is sharply negative.");
    } else if (trendPercent <= -4) {
      score -= 7;
    }
  } else {
    score -= 5;
  }

  if (volatilityPercent !== null) {
    if (volatilityPercent <= 6) {
      score += 7;
    } else if (volatilityPercent >= 18) {
      score -= 10;
      riskNotes.push("High volatility makes the buy timing riskier.");
    }
  }

  if (recentSales.length >= 5) {
    score += 8;
  } else if (recentSales.length > 0) {
    score += 3;
  } else {
    score -= 8;
    riskNotes.push(
      activeListings.length > 0
        ? "Recent sold comps are unavailable, so active listings are being used for context."
        : "Recent market comps are unavailable, so confidence is lower."
    );
  }

  if (!isProviderConfigured) {
    score -= 8;
    riskNotes.push("Live market history is limited for this card.");
  }

  const finalScore = Math.round(clamp(score, 0, 100));
  const signal = getSignal(finalScore);
  const dataQuality: InvestmentDataQuality = providerData
    ? recentSales.length > 0 && priceHistory.length > 1
      ? "full"
      : "partial"
    : "fallback";
  const confidence = dataQuality === "full" ? 82 : dataQuality === "partial" ? 62 : 38;
  const recentSalesSummary =
    recentSales.length > 0
      ? `${recentSales.length} recent sold comp${recentSales.length === 1 ? "" : "s"} found. Median sold price is ${
          salesMedian ? `$${salesMedian.toFixed(2)}` : "not available"
        }.`
      : activeListings.length > 0
        ? "No recent sold comps are available yet. Active listings are shown for market context."
        : "No recent sold comps are available yet.";

  return {
    card: {
      id: card.id,
      name: card.name,
      set: card.set,
      number: card.number,
      image: card.imageSmall ?? card.image,
    },
    signal,
    score: finalScore,
    confidence,
    dataQuality,
    purchasePriceUsd: round(purchasePriceUsd),
    fairValueUsd,
    trendSummary: describeTrend(trendPercent, Boolean(providerData)),
    recentSalesSummary,
    marketStability: describeStability(volatilityPercent, listingRange),
    demandScore,
    riskNotes: Array.from(new Set(riskNotes)).slice(0, 5),
    finalExplanation:
      fairValueUsd && fairValueUsd > 0
        ? `${signal}: this card's estimated fair value is $${fairValueUsd.toFixed(2)} against your $${purchasePriceUsd.toFixed(
            2
          )} purchase price. Confirm condition, printing, and seller trust before buying.`
        : `${signal}: there is not enough market data to estimate fair value confidently, so this should be watched instead of treated as a clear buy.`,
    sources: providerData ? ["Market pricing", "Card catalog"] : ["Card catalog"],
    priceHistory,
    recentSales,
    activeListings,
    listingRange,
    soldRange,
    isProviderConfigured,
  };
}
