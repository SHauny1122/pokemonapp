import { Card } from "@/lib/cards/types";

export type CollectionRange = "1D" | "7D" | "1M" | "3M" | "6M" | "MAX";

export type CollectionHistoryPoint = {
  label: string;
  value: number;
};

export type CollectionHistorySeries = {
  range: CollectionRange;
  points: CollectionHistoryPoint[];
  startValue: number;
  endValue: number;
  changeValue: number;
  changePercent: number;
};

type CollectionCardEntry = {
  card: Card;
  quantity: number;
};

const RANGE_CONFIG: Record<Exclude<CollectionRange, "MAX">, { points: number; move: number; label: string }> = {
  "1D": { points: 12, move: 0.008, label: "h" },
  "7D": { points: 7, move: 0.02, label: "d" },
  "1M": { points: 10, move: 0.05, label: "d" },
  "3M": { points: 12, move: 0.1, label: "w" },
  "6M": { points: 12, move: 0.16, label: "w" },
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getTrendWeight(cards: CollectionCardEntry[]) {
  const totalWeight = cards.reduce((sum, entry) => sum + (entry.card.marketValue ?? 0) * entry.quantity, 0);

  if (totalWeight <= 0) {
    return 0;
  }

  const trendScore = cards.reduce((sum, entry) => {
    const direction = entry.card.trend === "up" ? 1 : entry.card.trend === "down" ? -1 : 0;
    return sum + direction * (entry.card.marketValue ?? 0) * entry.quantity;
  }, 0);

  return trendScore / totalWeight;
}

function getVolatility(cards: CollectionCardEntry[]) {
  if (cards.length === 0) {
    return 0;
  }

  const value = cards.reduce((sum, entry) => {
    const marketValue = entry.card.marketValue ?? 0;
    const historyValues = entry.card.history.map((point) => point.value);
    const max = Math.max(...historyValues, marketValue);
    const min = Math.min(...historyValues, marketValue);
    const spread = marketValue > 0 ? (max - min) / marketValue : 0;
    return sum + spread * entry.quantity;
  }, 0);

  const qty = cards.reduce((sum, entry) => sum + entry.quantity, 0);
  return qty > 0 ? value / qty : 0;
}

function buildRangeSeries(
  range: Exclude<CollectionRange, "MAX">,
  cards: CollectionCardEntry[],
  currentTotalValue: number
): CollectionHistorySeries {
  const config = RANGE_CONFIG[range];
  const trendWeight = getTrendWeight(cards);
  const volatility = Math.min(getVolatility(cards), 0.4);
  const points: CollectionHistoryPoint[] = [];

  for (let index = 0; index < config.points; index += 1) {
    const progress = config.points === 1 ? 1 : index / (config.points - 1);
    const driftPct = (1 - progress) * trendWeight * config.move;
    const wavePct = Math.sin(progress * Math.PI * 2) * volatility * config.move * 0.45;
    const value = Math.max(0, currentTotalValue * (1 - driftPct + wavePct));

    points.push({
      label: `${index + 1}${config.label}`,
      value: roundCurrency(value),
    });
  }

  const startValue = points[0]?.value ?? currentTotalValue;
  const endValue = points[points.length - 1]?.value ?? currentTotalValue;
  const changeValue = endValue - startValue;
  const changePercent = startValue > 0 ? (changeValue / startValue) * 100 : 0;

  return {
    range,
    points,
    startValue,
    endValue,
    changeValue,
    changePercent,
  };
}

function buildMaxSeries(cards: CollectionCardEntry[], currentTotalValue: number): CollectionHistorySeries {
  const labels = cards[0]?.card.history.map((entry) => entry.date) ?? [];

  if (labels.length === 0) {
    return {
      range: "MAX",
      points: [
        { label: "Start", value: roundCurrency(currentTotalValue) },
        { label: "Now", value: roundCurrency(currentTotalValue) },
      ],
      startValue: roundCurrency(currentTotalValue),
      endValue: roundCurrency(currentTotalValue),
      changeValue: 0,
      changePercent: 0,
    };
  }

  const points = labels.map((label, historyIndex) => {
    const total = cards.reduce((sum, entry) => {
      const historyValue = entry.card.history[historyIndex]?.value ?? entry.card.marketValue ?? 0;
      return sum + historyValue * entry.quantity;
    }, 0);

    return {
      label,
      value: roundCurrency(total),
    };
  });

  const startValue = points[0]?.value ?? currentTotalValue;
  const endValue = points[points.length - 1]?.value ?? currentTotalValue;
  const changeValue = endValue - startValue;
  const changePercent = startValue > 0 ? (changeValue / startValue) * 100 : 0;

  return {
    range: "MAX",
    points,
    startValue,
    endValue,
    changeValue,
    changePercent,
  };
}

export function buildCollectionHistory(
  cards: CollectionCardEntry[],
  currentTotalValue: number,
  range: CollectionRange
): CollectionHistorySeries {
  if (range === "MAX") {
    return buildMaxSeries(cards, currentTotalValue);
  }

  return buildRangeSeries(range, cards, currentTotalValue);
}
