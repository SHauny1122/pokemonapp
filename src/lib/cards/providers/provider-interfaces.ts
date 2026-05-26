import { CardPagination } from "@/lib/cards/types";
import {
  PokemonTcgCardRecord,
  PokemonTcgListResponse,
  PokemonTcgSetRecord,
} from "@/lib/cards/providers/pokemon-tcg-provider";
import { PricingProviderHistory, PricingProviderSnapshot } from "@/lib/cards/providers/pricing-provider-types";

export type PokemonTCGProvider = {
  searchCards: (query: string, pagination?: CardPagination) => Promise<PokemonTcgListResponse<PokemonTcgCardRecord>>;
  fetchCardById: (cardId: string) => Promise<PokemonTcgCardRecord>;
  fetchSets: (pagination?: CardPagination) => Promise<PokemonTcgListResponse<PokemonTcgSetRecord>>;
  fetchSetById: (setId: string) => Promise<PokemonTcgSetRecord>;
  fetchCardsBySet: (
    setId: string,
    pagination?: CardPagination
  ) => Promise<PokemonTcgListResponse<PokemonTcgCardRecord>>;
};

export type FuturePriceProvider = {
  key: string;
  displayName: string;
  isConfigured: () => boolean;
  fetchSnapshot: (cardId: string) => Promise<PricingProviderSnapshot | undefined>;
};

export type FutureTrendProvider = {
  key: string;
  displayName: string;
  isConfigured: () => boolean;
  fetchHistory: (cardId: string) => Promise<PricingProviderHistory | undefined>;
};
