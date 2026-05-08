import { apiCardService } from "@/lib/cards/api-card-service";
import { mockCardService } from "@/lib/cards/mock-card-service";
import { mockCards, mockSets } from "@/lib/mock-data";
import { Card, CardService, CardSet } from "@/lib/cards/types";

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
const toMockCard = (card: (typeof mockCards)[number]): Card => ({ ...card });
const toMockSet = (set: (typeof mockSets)[number]): CardSet => ({ ...set });

export const searchCardsMockSync = (query: string): Card[] => {
  const q = query.trim().toLowerCase();

  if (!q) {
    return mockCards.map(toMockCard);
  }

  return mockCards
    .filter((card) => [card.name, card.set, card.number, card.rarity, card.type].join(" ").toLowerCase().includes(q))
    .map(toMockCard);
};

export const getCardByIdMockSync = (id: string): Card | undefined => {
  const card = mockCards.find((entry) => entry.id === id);
  return card ? toMockCard(card) : undefined;
};

export const getSetsMockSync = (): CardSet[] => {
  return mockSets.map(toMockSet);
};

export const getSetByIdMockSync = (setId: string): CardSet | undefined => {
  const set = mockSets.find((entry) => entry.id === setId);
  return set ? toMockSet(set) : undefined;
};

export const getCardsBySetMockSync = (setId: string): Card[] => {
  const set = mockSets.find((entry) => entry.id === setId);

  if (!set) {
    return [];
  }

  return mockCards.filter((card) => card.set === set.name).map(toMockCard);
};
