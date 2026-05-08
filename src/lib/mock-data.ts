export type CardPricePoint = {
  date: string;
  value: number;
};

export type PokemonCard = {
  id: string;
  name: string;
  type: string;
  set: string;
  number: string;
  rarity: string;
  image: string;
  marketValue: number;
  flipScore: number;
  trend: "up" | "flat" | "down";
  history: CardPricePoint[];
};

export const mockCollectionSummary = {
  totalCards: 42,
  collectionValue: 2740,
  weeklyChangePercent: 6.2,
};

export const mockCards: PokemonCard[] = [
  {
    id: "charizard-base-4",
    name: "Charizard",
    type: "Fire",
    set: "Base Set",
    number: "4/102",
    rarity: "Holo Rare",
    image: "🔥",
    marketValue: 920,
    flipScore: 88,
    trend: "up",
    history: [
      { date: "Jan", value: 710 },
      { date: "Feb", value: 760 },
      { date: "Mar", value: 810 },
      { date: "Apr", value: 880 },
      { date: "May", value: 920 },
    ],
  },
  {
    id: "blastoise-base-2",
    name: "Blastoise",
    type: "Water",
    set: "Base Set",
    number: "2/102",
    rarity: "Holo Rare",
    image: "💧",
    marketValue: 410,
    flipScore: 70,
    trend: "flat",
    history: [
      { date: "Jan", value: 392 },
      { date: "Feb", value: 401 },
      { date: "Mar", value: 398 },
      { date: "Apr", value: 409 },
      { date: "May", value: 410 },
    ],
  },
  {
    id: "venusaur-base-15",
    name: "Venusaur",
    type: "Grass",
    set: "Base Set",
    number: "15/102",
    rarity: "Holo Rare",
    image: "🌿",
    marketValue: 325,
    flipScore: 64,
    trend: "down",
    history: [
      { date: "Jan", value: 352 },
      { date: "Feb", value: 345 },
      { date: "Mar", value: 338 },
      { date: "Apr", value: 330 },
      { date: "May", value: 325 },
    ],
  },
  {
    id: "mewtwo-base-10",
    name: "Mewtwo",
    type: "Psychic",
    set: "Base Set",
    number: "10/102",
    rarity: "Holo Rare",
    image: "🧠",
    marketValue: 280,
    flipScore: 61,
    trend: "flat",
    history: [
      { date: "Jan", value: 262 },
      { date: "Feb", value: 275 },
      { date: "Mar", value: 271 },
      { date: "Apr", value: 279 },
      { date: "May", value: 280 },
    ],
  },
  {
    id: "lugia-neo-9",
    name: "Lugia",
    type: "Psychic",
    set: "Neo Genesis",
    number: "9/111",
    rarity: "Holo Rare",
    image: "🌊",
    marketValue: 640,
    flipScore: 79,
    trend: "up",
    history: [
      { date: "Jan", value: 560 },
      { date: "Feb", value: 585 },
      { date: "Mar", value: 598 },
      { date: "Apr", value: 620 },
      { date: "May", value: 640 },
    ],
  },
  {
    id: "typhlosion-neo-17",
    name: "Typhlosion",
    type: "Fire",
    set: "Neo Genesis",
    number: "17/111",
    rarity: "Holo Rare",
    image: "🔥",
    marketValue: 350,
    flipScore: 67,
    trend: "up",
    history: [
      { date: "Jan", value: 302 },
      { date: "Feb", value: 315 },
      { date: "Mar", value: 327 },
      { date: "Apr", value: 340 },
      { date: "May", value: 350 },
    ],
  },
  {
    id: "rayquaza-skyridge-146",
    name: "Rayquaza",
    type: "Dragon",
    set: "Skyridge",
    number: "146/144",
    rarity: "Holo Rare",
    image: "🐉",
    marketValue: 1100,
    flipScore: 90,
    trend: "up",
    history: [
      { date: "Jan", value: 920 },
      { date: "Feb", value: 970 },
      { date: "Mar", value: 1025 },
      { date: "Apr", value: 1070 },
      { date: "May", value: 1100 },
    ],
  },
  {
    id: "alakazam-skyridge-h1",
    name: "Alakazam",
    type: "Psychic",
    set: "Skyridge",
    number: "H1/H32",
    rarity: "Holo Rare",
    image: "🪄",
    marketValue: 720,
    flipScore: 83,
    trend: "flat",
    history: [
      { date: "Jan", value: 690 },
      { date: "Feb", value: 705 },
      { date: "Mar", value: 710 },
      { date: "Apr", value: 718 },
      { date: "May", value: 720 },
    ],
  },
];

export const mockLatestScan = mockCards[0];

export type PokemonSet = {
  id: string;
  name: string;
  era: string;
  releaseYear: number;
  icon: string;
  totalCards: number;
};

export const mockSets: PokemonSet[] = [
  {
    id: "base-set",
    name: "Base Set",
    era: "Wizards of the Coast",
    releaseYear: 1999,
    icon: "⭐",
    totalCards: 102,
  },
  {
    id: "neo-genesis",
    name: "Neo Genesis",
    era: "Neo Era",
    releaseYear: 2000,
    icon: "🌅",
    totalCards: 111,
  },
  {
    id: "skyridge",
    name: "Skyridge",
    era: "e-Card Era",
    releaseYear: 2003,
    icon: "🌌",
    totalCards: 144,
  },
];

export function getSetCards(setName: string) {
  return mockCards.filter((card) => card.set === setName);
}

export function getSetByName(setName: string) {
  return mockSets.find((set) => set.name === setName);
}
