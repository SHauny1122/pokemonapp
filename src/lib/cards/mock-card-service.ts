import { getSeedCardsBySet, seedCards, seedSets } from "@/lib/cards/seed-catalog";
import { CardService, PriceSummary } from "@/lib/cards/types";

function paginate<T>(items: T[], page?: number, pageSize?: number) {
  if (!page && !pageSize) {
    return items;
  }

  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.max(1, pageSize ?? items.length);
  const start = (safePage - 1) * safePageSize;

  return items.slice(start, start + safePageSize);
}

export const mockCardService: CardService = {
  async searchCards(query, pagination) {
    const q = query.trim().toLowerCase();
    const matches = q
      ? seedCards.filter((card) => [card.name, card.set, card.number, card.rarity, card.type].join(" ").toLowerCase().includes(q))
      : seedCards;

    return paginate(matches, pagination?.page, pagination?.pageSize);
  },

  async getCardById(id) {
    return seedCards.find((entry) => entry.id === id);
  },

  async getSets(pagination) {
    return paginate(seedSets, pagination?.page, pagination?.pageSize);
  },

  async getSetById(setId) {
    return seedSets.find((entry) => entry.id === setId);
  },

  async getCardsBySet(setId, pagination) {
    return paginate(getSeedCardsBySet(setId), pagination?.page, pagination?.pageSize);
  },

  getPriceSummary(cardId) {
    const card = seedCards.find((entry) => entry.id === cardId);

    if (!card) {
      return undefined;
    }

    const summary: PriceSummary = {
      cardId: card.id,
      marketPrice: card.marketValue,
      pricing: card.pricing,
      flipScore: card.flipScore,
      trend: card.trend,
      history: card.history,
    };

    return summary;
  },

  getDealCheck() {
    return undefined;
  },
};
