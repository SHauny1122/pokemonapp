import { apiCardService } from "@/lib/cards/api-card-service";
import { Card, CardService, CardSet } from "@/lib/cards/types";
import { getSeedCardsBySet, seedCards, seedSets } from "@/lib/cards/seed-catalog";

// Public app-facing service layer.
//
// Catalog data (cards/sets/search) comes from API adapter with mock fallback.
// Pricing/deal-check prefer API card pricing and fall back to mock data.
export const cardService: CardService = {
  searchCards: apiCardService.searchCards,
  getCardById: apiCardService.getCardById,
  getSets: apiCardService.getSets,
  getSetById: apiCardService.getSetById,
  getCardsBySet: apiCardService.getCardsBySet,
  getPriceSummary: apiCardService.getPriceSummary,
  getDealCheck: apiCardService.getDealCheck,
};

export const searchCards = cardService.searchCards;
export const getCardById = cardService.getCardById;
export const getSets = cardService.getSets;
export const getSetById = cardService.getSetById;
export const getCardsBySet = cardService.getCardsBySet;
export const getPriceSummary = cardService.getPriceSummary;
export const getDealCheck = cardService.getDealCheck;

// Mock-sync helpers keep existing mock-first screens and local collection
// behavior stable while we progressively move more flows to async API data.
const toMockCard = (card: Card): Card => ({ ...card });
const toMockSet = (set: CardSet): CardSet => ({ ...set });

export const searchCardsMockSync = (query: string): Card[] => {
  const q = query.trim().toLowerCase();

  if (!q) {
    return seedCards.map(toMockCard);
  }

  return seedCards
    .filter((card) => [card.name, card.set, card.number, card.rarity, card.type].join(" ").toLowerCase().includes(q))
    .map(toMockCard);
};

export const getCardByIdMockSync = (id: string): Card | undefined => {
  const card = seedCards.find((entry) => entry.id === id);
  return card ? toMockCard(card) : undefined;
};

export const getSetsMockSync = (): CardSet[] => {
  return seedSets.map(toMockSet);
};

export const getSetByIdMockSync = (setId: string): CardSet | undefined => {
  const set = seedSets.find((entry) => entry.id === setId);
  return set ? toMockSet(set) : undefined;
};

export const getCardsBySetMockSync = (setId: string): Card[] => {
  return getSeedCardsBySet(setId).map(toMockCard);
};
