"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/auth-provider";
import { getCardById } from "@/lib/cards/card-service";
import { Card } from "@/lib/cards/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
  isSyncing: boolean;
  syncError: string | null;
  addCard: (cardId: string) => void;
  removeCard: (cardId: string) => void;
  removeCardCompletely: (cardId: string) => void;
  getQuantity: (cardId: string) => number;
  hasCard: (cardId: string) => boolean;
};

type CollectionItemRow = {
  card_id: string;
  quantity: number;
};

const LEGACY_STORAGE_KEY = "smart-collector.collection.v1";
const GUEST_STORAGE_KEY = "smart-collector.collection.guest.v1";
const USER_BACKUP_STORAGE_KEY_PREFIX = "smart-collector.collection.user-backup.";
const MIGRATION_KEY_PREFIX = "smart-collector.collection.migrated.";

function normalizeCollectionItems(rawItems: CollectionItem[]) {
  const totals = new Map<string, number>();

  rawItems.forEach((entry) => {
    if (!entry.cardId || !Number.isFinite(entry.quantity) || entry.quantity <= 0) {
      return;
    }

    totals.set(entry.cardId, (totals.get(entry.cardId) ?? 0) + Math.floor(entry.quantity));
  });

  return Array.from(totals.entries()).map(([cardId, quantity]) => ({ cardId, quantity }));
}

function mergeCollectionItems(baseItems: CollectionItem[], incomingItems: CollectionItem[]) {
  return normalizeCollectionItems([...baseItems, ...incomingItems]);
}

const CollectionContext = createContext<CollectionContextValue | undefined>(undefined);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const { user, isSupabaseConfigured } = useAuth();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [resolvedCardsById, setResolvedCardsById] = useState<Record<string, Card>>({});
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const readCollectionFromStorage = useCallback((storageKey: string) => {
    try {
      const raw = window.localStorage.getItem(storageKey);

      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as CollectionItem[];
      return normalizeCollectionItems(parsed);
    } catch {
      return [];
    }
  }, []);

  const readGuestItems = useCallback(() => {
    const guestItems = readCollectionFromStorage(GUEST_STORAGE_KEY);

    if (guestItems.length > 0) {
      return guestItems;
    }

    return readCollectionFromStorage(LEGACY_STORAGE_KEY);
  }, [readCollectionFromStorage]);

  const writeGuestItems = useCallback((nextItems: CollectionItem[]) => {
    const normalized = normalizeCollectionItems(nextItems);
    const serialized = JSON.stringify(normalized);
    window.localStorage.setItem(GUEST_STORAGE_KEY, serialized);
    window.localStorage.setItem(LEGACY_STORAGE_KEY, serialized);
  }, []);

  const writeUserBackupItems = useCallback((userId: string, nextItems: CollectionItem[]) => {
    const normalized = normalizeCollectionItems(nextItems);
    window.localStorage.setItem(`${USER_BACKUP_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(normalized));
  }, []);

  const hasUserCollectionMigrated = useCallback((userId: string) => {
    return window.localStorage.getItem(`${MIGRATION_KEY_PREFIX}${userId}`) === "done";
  }, []);

  const markUserCollectionMigrated = useCallback((userId: string) => {
    window.localStorage.setItem(`${MIGRATION_KEY_PREFIX}${userId}`, "done");
  }, []);

  const persistAccountCollection = useCallback(async (nextItems: CollectionItem[], removedCardIds: string[]) => {
    if (!supabase || !isSupabaseConfigured || !user) {
      return;
    }

    const normalized = normalizeCollectionItems(nextItems);
    setSyncError(null);
    setIsSyncing(true);

    try {
      if (normalized.length > 0) {
        const upsertPayload = normalized.map((entry) => ({
          user_id: user.id,
          card_id: entry.cardId,
          quantity: entry.quantity,
        }));

        const { error: upsertError } = await supabase
          .from("collection_items")
          .upsert(upsertPayload, { onConflict: "user_id,card_id" });

        if (upsertError) {
          throw upsertError;
        }
      }

      if (removedCardIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("collection_items")
          .delete()
          .eq("user_id", user.id)
          .in("card_id", removedCardIds);

        if (deleteError) {
          throw deleteError;
        }
      }
    } catch {
      setSyncError("Unable to sync collection right now. Changes are kept on this device.");
    } finally {
      setIsSyncing(false);
    }
  }, [isSupabaseConfigured, supabase, user]);

  useEffect(() => {
    setItems(readGuestItems());
    setIsHydrated(true);
  }, [readGuestItems]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (user) {
      writeUserBackupItems(user.id, items);
      return;
    }

    writeGuestItems(items);
  }, [isHydrated, items, user, writeGuestItems, writeUserBackupItems]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!supabase || !isSupabaseConfigured || !user) {
      setSyncError(null);
      setIsSyncing(false);
      setItems(readGuestItems());
      return;
    }

    let cancelled = false;

    const syncFromAccount = async () => {
      setSyncError(null);
      setIsSyncing(true);

      try {
        const { data, error } = await supabase
          .from("collection_items")
          .select("card_id, quantity")
          .eq("user_id", user.id);

        if (error) {
          throw error;
        }

        const accountItems = normalizeCollectionItems(
          ((data ?? []) as CollectionItemRow[]).map((entry) => ({
            cardId: entry.card_id,
            quantity: entry.quantity,
          }))
        );

        const guestItems = readGuestItems();
        const shouldMigrateGuest = guestItems.length > 0 && !hasUserCollectionMigrated(user.id);

        if (shouldMigrateGuest) {
          const mergedItems = mergeCollectionItems(accountItems, guestItems);

          if (mergedItems.length > 0) {
            const { error: mergeError } = await supabase
              .from("collection_items")
              .upsert(
                mergedItems.map((entry) => ({
                  user_id: user.id,
                  card_id: entry.cardId,
                  quantity: entry.quantity,
                })),
                { onConflict: "user_id,card_id" }
              );

            if (mergeError) {
              throw mergeError;
            }
          }

          if (!cancelled) {
            setItems(mergedItems);
          }

          writeGuestItems([]);
          markUserCollectionMigrated(user.id);
        } else if (!cancelled) {
          setItems(accountItems);
        }
      } catch {
        if (!cancelled) {
          setSyncError("Unable to load account collection. Showing local data.");
          setItems(readGuestItems());
        }
      } finally {
        if (!cancelled) {
          setIsSyncing(false);
        }
      }
    };

    void syncFromAccount();

    return () => {
      cancelled = true;
    };
  }, [
    hasUserCollectionMigrated,
    isHydrated,
    isSupabaseConfigured,
    markUserCollectionMigrated,
    readGuestItems,
    supabase,
    user,
    writeGuestItems,
  ]);

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

      const nextItems = existing
        ? current.map((entry) =>
            entry.cardId === cardId ? { ...entry, quantity: entry.quantity + 1 } : entry
          )
        : [...current, { cardId, quantity: 1 }];

      void persistAccountCollection(nextItems, []);
      return nextItems;
    });
  };

  const removeCard = (cardId: string) => {
    setItems((current) => {
      const target = current.find((entry) => entry.cardId === cardId);

      if (!target) {
        return current;
      }

      if (target.quantity <= 1) {
        const nextItems = current.filter((entry) => entry.cardId !== cardId);
        void persistAccountCollection(nextItems, [cardId]);
        return nextItems;
      }

      const nextItems = current.map((entry) =>
        entry.cardId === cardId ? { ...entry, quantity: entry.quantity - 1 } : entry
      );

      void persistAccountCollection(nextItems, []);
      return nextItems;
    });
  };

  const removeCardCompletely = (cardId: string) => {
    setItems((current) => {
      const hasTarget = current.some((entry) => entry.cardId === cardId);

      if (!hasTarget) {
        return current;
      }

      const nextItems = current.filter((entry) => entry.cardId !== cardId);
      void persistAccountCollection(nextItems, [cardId]);
      return nextItems;
    });
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
        isSyncing,
        syncError,
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
