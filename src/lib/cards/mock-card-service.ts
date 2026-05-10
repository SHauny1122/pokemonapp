import { mockCards, mockSets } from "@/lib/mock-data";
import {
  Card,
  CardService,
  CardSet,
  PriceSummary,
} from "@/lib/cards/types";

function toCard(card: (typeof mockCards)[number]): Card {
  return {
    ...card,
    dataSource: "mock",
  };
}

function toSet(set: (typeof mockSets)[number]): CardSet {
  return { ...set };
}

export const mockCardService: CardService = {
  async searchCards(query) {
    const q = query.trim().toLowerCase();

    if (!q) {
      return mockCards.map(toCard);
    }

    return mockCards
      .filter((card) => {
        const searchable = [card.name, card.set, card.number, card.rarity, card.type]
          .join(" ")
          .toLowerCase();
        return searchable.includes(q);
      })
      .map(toCard);
  },

  async getCardById(id) {
    const card = mockCards.find((entry) => entry.id === id);
    return card ? toCard(card) : undefined;
  },

  async getSets() {
    return mockSets.map(toSet);
  },

  async getSetById(setId) {
    const set = mockSets.find((entry) => entry.id === setId);
    return set ? toSet(set) : undefined;
  },

  async getCardsBySet(setId) {
    const set = mockSets.find((entry) => entry.id === setId);

    if (!set) {
      return [];
    }

    return mockCards.filter((card) => card.set === set.name).map(toCard);
  },

  getPriceSummary(cardId) {
    const card = mockCards.find((entry) => entry.id === cardId);

    if (!card) {
      return undefined;
    }

    const summary: PriceSummary = {
      cardId: card.id,
      marketPrice: card.marketValue,
      flipScore: card.flipScore,
      trend: card.trend,
      history: card.history,
    };

    return summary;
  },

  getDealCheck(cardId, askingPrice) {
    return undefined;
  },
};
