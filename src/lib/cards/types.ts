export type PriceTrend = "up" | "flat" | "down";

export type CardPricePoint = {
  date: string;
  value: number;
};

export type CardPriceBreakdown = {
  low?: number;
  mid?: number;
  high?: number;
  market?: number;
  directLow?: number;
};

export type CardPricing = {
  currency: "USD";
  source: "tcgplayer" | "mock";
  selectedVariant?: string;
  selectedPriceType?: "market" | "mid" | "high" | "low";
  variants?: Record<string, CardPriceBreakdown>;
};

export type Card = {
  id: string;
  name: string;
  type: string;
  types?: string[];
  supertype?: string;
  setId?: string;
  set: string;
  releaseDate?: string;
  number: string;
  rarity: string;
  image: string;
  marketValue: number | null;
  pricing?: CardPricing;
  tcgplayerPrices?: Record<string, CardPriceBreakdown>;
  cardmarketPrices?: CardPriceBreakdown;
  dataSource?: "mock" | "pokemon-tcg-api";
  flipScore: number;
  trend: PriceTrend;
  history: CardPricePoint[];
};

export type CardSet = {
  id: string;
  name: string;
  era: string;
  releaseYear: number;
  icon: string;
  totalCards: number;
};

export type PriceSummary = {
  cardId: string;
  marketPrice: number | null;
  pricing?: CardPricing;
  flipScore: number;
  trend: PriceTrend;
  history: CardPricePoint[];
};

export type DealVerdict = "GOOD BUY" | "FAIR PRICE" | "OVERPRICED";

export type DealCheckSignal = {
  key: string;
  label: string;
  valueText: string;
  weight: number;
  score: number;
  impact: "positive" | "neutral" | "negative";
  note: string;
};

export type DealCheckResult = {
  card: Card;
  askingPrice: number;
  marketPrice: number;
  differencePercent: number;
  verdict: DealVerdict;
  explanation: string;
  flipScoreNote: string;
  confidence: number;
  score: number;
  averageSoldPrice: number;
  medianSoldPrice: number;
  recentSoldPrices: number[];
  trend30d: PriceTrend;
  trend30dPercent: number;
  volatilityPercent: number;
  liquidityScore: number;
  demandScore: number;
  savingsAmount: number;
  activityLabel: string;
  insights: string[];
  signalBreakdown: DealCheckSignal[];
};

export type CardService = {
  searchCards: (query: string) => Promise<Card[]>;
  getCardById: (id: string) => Promise<Card | undefined>;
  getSets: () => Promise<CardSet[]>;
  getSetById: (setId: string) => Promise<CardSet | undefined>;
  getCardsBySet: (setId: string) => Promise<Card[]>;
  getPriceSummary: (cardId: string) => PriceSummary | undefined;
  getDealCheck: (cardId: string, askingPrice: number) => DealCheckResult | undefined;
};
