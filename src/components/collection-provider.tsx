"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getCardById } from "@/lib/cards/card-service";
import { Card } from "@/lib/cards/types";

type CollectionItem = {
  cardId: string;
  quantity: number;
};

type CollectionCard = {
  card: Card;
  quantity: number;
};

type CollectionContextValue = {
  items: CollectionItem[];
  cards: CollectionCard[];
  totalCards: number;
  totalValue: number;
  isHydrated: boolean;
  addCard: (cardId: string) => void;
  removeCard: (cardId: string) => void;
  removeCardCompletely: (cardId: string) => void;
  getQuantity: (cardId: string) => number;
  hasCard: (cardId: string) => boolean;
};

const STORAGE_KEY = "smart-collector.collection.v1";

const CollectionContext = createContext<CollectionContextValue | undefined>(undefined);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [resolvedCardsById, setResolvedCardsById] = useState<Record<string, Card>>({});
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as CollectionItem[];
        const cleaned = parsed.filter((entry) => entry.cardId && entry.quantity > 0);
        setItems(cleaned);
      }
    } catch {
      setItems([]);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, isHydrated]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const uniqueIds = Array.from(new Set(items.map((entry) => entry.cardId)));

    if (uniqueIds.length === 0) {
      setResolvedCardsById({});
      return;
    }

    let cancelled = false;

    const resolveCards = async () => {
      const resolved = await Promise.all(
        uniqueIds.map(async (cardId) => {
          const card = await getCardById(cardId);
          return { cardId, card };
        })
      );

      if (cancelled) {
        return;
      }

      const nextMap: Record<string, Card> = {};

      resolved.forEach(({ cardId, card }) => {
        if (card) {
          nextMap[cardId] = card;
        }
      });

      setResolvedCardsById(nextMap);
    };

    resolveCards();

    return () => {
      cancelled = true;
    };
  }, [items, isHydrated]);

  const cards = useMemo<CollectionCard[]>(() => {
    return items
      .map((entry) => {
        const card = resolvedCardsById[entry.cardId];

        if (!card) {
          return null;
        }

        return {
          card,
          quantity: entry.quantity,
        };
      })
      .filter((entry): entry is CollectionCard => entry !== null);
  }, [items, resolvedCardsById]);

  const totalCards = useMemo(
    () => cards.reduce((total, entry) => total + entry.quantity, 0),
    [cards]
  );

  const totalValue = useMemo(
    () => cards.reduce((total, entry) => total + (entry.card.marketValue ?? 0) * entry.quantity, 0),
    [cards]
  );

  const addCard = (cardId: string) => {
    setItems((current) => {
      const existing = current.find((entry) => entry.cardId === cardId);

      if (!existing) {
        return [...current, { cardId, quantity: 1 }];
      }

      return current.map((entry) =>
        entry.cardId === cardId ? { ...entry, quantity: entry.quantity + 1 } : entry
      );
    });
  };

  const removeCard = (cardId: string) => {
    setItems((current) => {
      const target = current.find((entry) => entry.cardId === cardId);

      if (!target) {
        return current;
      }

      if (target.quantity <= 1) {
        return current.filter((entry) => entry.cardId !== cardId);
      }

      return current.map((entry) =>
        entry.cardId === cardId ? { ...entry, quantity: entry.quantity - 1 } : entry
      );
    });
  };

  const removeCardCompletely = (cardId: string) => {
    setItems((current) => current.filter((entry) => entry.cardId !== cardId));
  };

  const getQuantity = (cardId: string) => {
    const item = items.find((entry) => entry.cardId === cardId);
    return item?.quantity ?? 0;
  };

  const hasCard = (cardId: string) => getQuantity(cardId) > 0;

  return (
    <CollectionContext.Provider
      value={{
        items,
        cards,
        totalCards,
        totalValue,
        isHydrated,
        addCard,
        removeCard,
        removeCardCompletely,
        getQuantity,
        hasCard,
      }}
    >
      {children}
    </CollectionContext.Provider>
  );
}

export function useCollection() {
  const context = useContext(CollectionContext);

  if (!context) {
    throw new Error("useCollection must be used inside CollectionProvider");
  }

  return context;
}
