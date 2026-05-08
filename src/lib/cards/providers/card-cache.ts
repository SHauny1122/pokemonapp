import { Card, CardSet } from "@/lib/cards/types";

type CachedEntry<T> = {
  value: T;
  expiresAt: number;
};

const SEARCH_CACHE_TTL_MS = 60 * 1000;
const SET_CARDS_CACHE_TTL_MS = 5 * 60 * 1000;

const cardCache = new Map<string, Card>();
const setCache = new Map<string, CardSet>();
const searchCache = new Map<string, CachedEntry<Card[]>>();
const setCardsCache = new Map<string, CachedEntry<Card[]>>();

function isFresh<T>(entry: CachedEntry<T> | undefined) {
  return Boolean(entry && entry.expiresAt > Date.now());
}

export function getCachedCardById(cardId: string) {
  return cardCache.get(cardId);
}

export function cacheCard(card: Card) {
  cardCache.set(card.id, card);
}

export function cacheCards(cards: Card[]) {
  cards.forEach((card) => cacheCard(card));
}

export function getCachedSetById(setId: string) {
  return setCache.get(setId);
}

export function cacheSet(set: CardSet) {
  setCache.set(set.id, set);
}

export function cacheSets(sets: CardSet[]) {
  sets.forEach((set) => cacheSet(set));
}

export function getCachedSearch(query: string) {
  const key = query.trim().toLowerCase();
  const entry = searchCache.get(key);

  if (!entry || !isFresh(entry)) {
    searchCache.delete(key);
    return undefined;
  }

  return entry.value;
}

export function cacheSearch(query: string, cards: Card[]) {
  const key = query.trim().toLowerCase();
  searchCache.set(key, {
    value: cards,
    expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
  });
}

export function getCachedSetCards(setId: string) {
  const entry = setCardsCache.get(setId);

  if (!entry || !isFresh(entry)) {
    setCardsCache.delete(setId);
    return undefined;
  }

  return entry.value;
}

export function cacheSetCards(setId: string, cards: Card[]) {
  setCardsCache.set(setId, {
    value: cards,
    expiresAt: Date.now() + SET_CARDS_CACHE_TTL_MS,
  });
}
