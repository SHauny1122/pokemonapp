import { Card, DealCheckResult, DealCheckSignal, DealVerdict, PriceTrend } from "@/lib/cards/types";

type DealSignalsInput = {
  askingPrice: number;
  marketPrice: number;
  medianSoldPrice: number;
  averageSoldPrice: number;
  trendPercent: number;
  volatilityPercent: number;
  liquidityScore: number;
  demandScore: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

function standardDeviation(values: number[]) {
  if (values.length <= 1) {
    return 0;
  }

  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function toTrendFromPercent(value: number): PriceTrend {
  if (value >= 3) {
    return "up";
  }

  if (value <= -3) {
    return "down";
  }

  return "flat";
}

function buildFallbackSoldPrices(card: Card, marketPrice: number) {
  const trendOffsets =
    card.trend === "up"
      ? [-0.12, -0.07, -0.03, 0.01, 0.04]
      : card.trend === "down"
        ? [0.08, 0.04, 0.01, -0.03, -0.08]
        : [-0.05, -0.03, 0, 0.02, 0.04];

  const flipModifier = (card.flipScore - 65) / 1000;

  return trendOffsets.map((offset) => roundToCents(Math.max(1, marketPrice * (1 + offset + flipModifier))));
}

function getRecentSoldPrices(card: Card, marketPrice: number) {
  const fromHistory = card.history
    .slice(-6)
    .map((point) => point.value)
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => roundToCents(value));

  if (fromHistory.length >= 4) {
    return fromHistory;
  }

  return buildFallbackSoldPrices(card, marketPrice);
}

function getImpact(score: number): DealCheckSignal["impact"] {
  if (score >= 62) {
    return "positive";
  }

  if (score <= 43) {
    return "negative";
  }

  return "neutral";
}

function buildSignals(input: DealSignalsInput) {
  const priceGapPercent = ((input.askingPrice - input.medianSoldPrice) / input.medianSoldPrice) * 100;

  const factorScores = {
    price: clamp(78 - priceGapPercent * 3.2, 0, 100),
    trend: clamp(50 + input.trendPercent * 2.6, 0, 100),
    volatility: clamp(96 - input.volatilityPercent * 3.5, 0, 100),
    liquidity: clamp(input.liquidityScore, 0, 100),
    demand: clamp(input.demandScore, 0, 100),
  };

  const signals: DealCheckSignal[] = [
    {
      key: "price-vs-sold",
      label: "Price vs median sold",
      valueText: `${priceGapPercent > 0 ? "+" : ""}${priceGapPercent.toFixed(1)}%`,
      weight: 40,
      score: Math.round(factorScores.price),
      impact: getImpact(factorScores.price),
      note:
        priceGapPercent <= -8
          ? "Listing sits clearly below recent sold median."
          : priceGapPercent >= 10
            ? "Listing is meaningfully above recent sold median."
            : "Listing is close to where recent sales are clearing.",
    },
    {
      key: "trend",
      label: "30-day trend",
      valueText: `${input.trendPercent > 0 ? "+" : ""}${input.trendPercent.toFixed(1)}%`,
      weight: 18,
      score: Math.round(factorScores.trend),
      impact: getImpact(factorScores.trend),
      note:
        input.trendPercent >= 4
          ? "Recent sales are stepping up month over month."
          : input.trendPercent <= -4
            ? "Recent sales are trending down."
            : "Recent sales are stable.",
    },
    {
      key: "volatility",
      label: "Price volatility",
      valueText: `${input.volatilityPercent.toFixed(1)}%`,
      weight: 12,
      score: Math.round(factorScores.volatility),
      impact: getImpact(factorScores.volatility),
      note:
        input.volatilityPercent <= 8
          ? "Tight sold-price range improves confidence."
          : input.volatilityPercent >= 16
            ? "Wide sold-price swings increase risk."
            : "Normal variability for this card tier.",
    },
    {
      key: "liquidity",
      label: "Liquidity activity",
      valueText: `${Math.round(input.liquidityScore)}/100`,
      weight: 15,
      score: Math.round(factorScores.liquidity),
      impact: getImpact(factorScores.liquidity),
      note:
        input.liquidityScore >= 70
          ? "Listings and sold comps suggest healthy movement."
          : input.liquidityScore <= 45
            ? "Fewer reliable comps, so exits may be slower."
            : "Average market movement.",
    },
    {
      key: "demand",
      label: "Collector demand",
      valueText: `${Math.round(input.demandScore)}/100`,
      weight: 15,
      score: Math.round(factorScores.demand),
      impact: getImpact(factorScores.demand),
      note:
        input.demandScore >= 72
          ? "Collector demand appears strong relative to peers."
          : input.demandScore <= 45
            ? "Demand looks softer, which caps upside."
            : "Demand appears steady.",
    },
  ];

  const overallScore = Math.round(
    signals.reduce((sum, signal) => sum + (signal.score * signal.weight) / 100, 0)
  );

  return {
    overallScore,
    signals,
    priceGapPercent,
  };
}

function buildInsights(verdict: DealVerdict, signals: DealCheckSignal[]) {
  const ordered = [...signals].sort((a, b) => b.weight * b.score - a.weight * a.score);
  const topSignals = ordered.slice(0, 3);

  if (verdict === "GOOD BUY") {
    return topSignals.map((signal) => `${signal.label}: ${signal.note}`);
  }

  if (verdict === "OVERPRICED") {
    return topSignals.map((signal) => `${signal.label}: ${signal.note}`);
  }

  return topSignals.map((signal) => `${signal.label}: ${signal.note}`);
}

function getVerdict(overallScore: number, priceGapPercent: number, demandScore: number, trendPercent: number): DealVerdict {
  if (priceGapPercent <= -8 && overallScore >= 58) {
    return "GOOD BUY";
  }

  if (priceGapPercent >= 12 || (overallScore < 42 && (demandScore < 50 || trendPercent < -4))) {
    return "OVERPRICED";
  }

  return "FAIR PRICE";
}

function getConfidence(verdict: DealVerdict, signals: DealCheckSignal[], dataPoints: number, priceGapPercent: number) {
  const alignedSignals = signals.filter((signal) => signal.impact !== "neutral").length;
  const base = 55 + alignedSignals * 3 + clamp(Math.abs(priceGapPercent) * 0.55, 0, 12) + dataPoints;
  const adjusted = verdict === "FAIR PRICE" ? base - 6 : base;
  return Math.round(clamp(adjusted, 52, 89));
}

function getFlipScoreNote(score: number, verdict: DealVerdict) {
  if (score >= 80) {
    return verdict === "GOOD BUY"
      ? "High flip profile plus discount creates a strong entry."
      : "Strong card profile, but purchase price still drives returns.";
  }

  if (score >= 65) {
    return "Balanced card profile. Entry price discipline remains important.";
  }

  return "Lower upside profile. Prioritize deeper discounts before buying.";
}

function getSummary(verdict: DealVerdict, priceGapPercent: number, trendPercent: number, liquidityScore: number) {
  if (verdict === "GOOD BUY") {
    return `This listing is ${Math.abs(priceGapPercent).toFixed(1)}% below recent sold median with ${trendPercent >= 0 ? "stable-to-rising" : "mixed"} momentum and healthy activity.`;
  }

  if (verdict === "OVERPRICED") {
    return `This listing is ${priceGapPercent.toFixed(1)}% above recent sold median and market support is not strong enough to justify that premium.`;
  }

  return `This listing is near current sold levels. Market activity (${Math.round(liquidityScore)}/100) suggests a fair but not discounted entry.`;
}

function getActivityLabel(liquidityScore: number) {
  if (liquidityScore >= 72) {
    return "High activity";
  }

  if (liquidityScore >= 52) {
    return "Steady activity";
  }

  return "Light activity";
}

export function evaluateDealCheck(card: Card, askingPrice: number): DealCheckResult | undefined {
  if (!Number.isFinite(askingPrice) || askingPrice <= 0 || card.marketValue === null || card.marketValue <= 0) {
    return undefined;
  }

  const marketPrice = card.marketValue;
  const recentSoldPrices = getRecentSoldPrices(card, marketPrice);
  const averageSoldPrice = roundToCents(average(recentSoldPrices));
  const medianSoldPrice = roundToCents(median(recentSoldPrices));
  const trendPercent =
    recentSoldPrices.length > 1
      ? ((recentSoldPrices[recentSoldPrices.length - 1] - recentSoldPrices[0]) / recentSoldPrices[0]) * 100
      : 0;
  const volatilityPercent = roundToCents((standardDeviation(recentSoldPrices) / averageSoldPrice) * 100);
  const liquidityScore = clamp(74 - volatilityPercent * 1.8 + (trendPercent >= 0 ? 5 : -4), 32, 90);
  const demandScore = clamp(card.flipScore * 0.78 + (trendPercent >= 0 ? 7 : -6), 28, 92);

  const { overallScore, signals, priceGapPercent } = buildSignals({
    askingPrice,
    marketPrice,
    medianSoldPrice,
    averageSoldPrice,
    trendPercent,
    volatilityPercent,
    liquidityScore,
    demandScore,
  });

  const verdict = getVerdict(overallScore, priceGapPercent, demandScore, trendPercent);
  const confidence = getConfidence(verdict, signals, recentSoldPrices.length, priceGapPercent);
  const trend30d = toTrendFromPercent(trendPercent);

  return {
    card,
    askingPrice,
    marketPrice,
    differencePercent: ((askingPrice - marketPrice) / marketPrice) * 100,
    verdict,
    explanation: getSummary(verdict, priceGapPercent, trendPercent, liquidityScore),
    flipScoreNote: getFlipScoreNote(card.flipScore, verdict),
    confidence,
    score: overallScore,
    averageSoldPrice,
    medianSoldPrice,
    recentSoldPrices,
    trend30d,
    trend30dPercent: roundToCents(trendPercent),
    volatilityPercent,
    liquidityScore: Math.round(liquidityScore),
    demandScore: Math.round(demandScore),
    savingsAmount: roundToCents(medianSoldPrice - askingPrice),
    activityLabel: getActivityLabel(liquidityScore),
    insights: buildInsights(verdict, signals),
    signalBreakdown: signals,
  };
}
