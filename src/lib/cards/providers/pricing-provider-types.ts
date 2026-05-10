import { Card, DealPriceSource } from "@/lib/cards/types";

export type PricingProviderSnapshot = {
  source: DealPriceSource;
  marketPrice?: number;
  lowPrice?: number;
  midPrice?: number;
  highPrice?: number;
  buylistPrice?: number;
  updatedAt?: string;
};

export type PricingHistoryPoint = {
  timestamp: string;
  value: number;
};

export type PricingProviderHistory = {
  source: string;
  points: PricingHistoryPoint[];
};

export type ExternalPricingProvider = {
  key: string;
  displayName: string;
  isConfigured: () => boolean;
  fetchSnapshot: (card: Card) => Promise<PricingProviderSnapshot | undefined>;
  fetchHistory: (card: Card) => Promise<PricingProviderHistory | undefined>;
};

export const FUTURE_PRICING_PROVIDER_KEYS = {
  tcgplayerDirect: "tcgplayer-direct-api",
  priceCharting: "pricecharting-api",
  ebaySold: "ebay-sold-api",
} as const;
