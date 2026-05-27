import type { Card, CardSet } from "@/lib/cards/types";

const seedSetRecords = [
  ["base1", "Base", "Base", 1999, 102],
  ["base2", "Jungle", "Base", 1999, 64],
  ["base3", "Fossil", "Base", 1999, 62],
  ["base4", "Base Set 2", "Base", 2000, 130],
  ["base5", "Team Rocket", "Base", 2000, 83],
  ["gym1", "Gym Heroes", "Gym", 2000, 132],
  ["gym2", "Gym Challenge", "Gym", 2000, 132],
  ["neo1", "Neo Genesis", "Neo", 2000, 111],
  ["neo2", "Neo Discovery", "Neo", 2001, 75],
  ["neo3", "Neo Revelation", "Neo", 2001, 66],
  ["neo4", "Neo Destiny", "Neo", 2002, 113],
  ["base6", "Legendary Collection", "Other", 2002, 110],
  ["ecard1", "Expedition Base Set", "E-Card", 2002, 165],
  ["ecard2", "Aquapolis", "E-Card", 2003, 186],
  ["ecard3", "Skyridge", "E-Card", 2003, 182],
  ["ex1", "Ruby & Sapphire", "EX", 2003, 109],
  ["ex3", "Dragon", "EX", 2003, 100],
  ["ex6", "FireRed & LeafGreen", "EX", 2004, 116],
  ["ex8", "Deoxys", "EX", 2005, 108],
  ["dp1", "Diamond & Pearl", "Diamond & Pearl", 2007, 130],
  ["pl1", "Platinum", "Platinum", 2009, 133],
  ["hgss1", "HeartGold & SoulSilver", "HeartGold & SoulSilver", 2010, 124],
  ["bw1", "Black & White", "Black & White", 2011, 115],
  ["xy1", "XY", "XY", 2014, 146],
  ["sm1", "Sun & Moon", "Sun & Moon", 2017, 163],
  ["swsh1", "Sword & Shield", "Sword & Shield", 2020, 216],
  ["swsh3", "Darkness Ablaze", "Sword & Shield", 2020, 201],
  ["swsh45", "Shining Fates", "Sword & Shield", 2021, 73],
  ["swsh45sv", "Shining Fates: Shiny Vault", "Sword & Shield", 2021, 122],
  ["swsh7", "Evolving Skies", "Sword & Shield", 2021, 237],
  ["sv1", "Scarlet & Violet", "Scarlet & Violet", 2023, 258],
] as const;

export const seedSets: CardSet[] = seedSetRecords.map(([id, name, era, releaseYear, totalCards]) => ({
  id,
  name,
  era,
  releaseYear,
  releaseDate: `${releaseYear}/01/01`,
  icon: "TCG",
  totalCards,
  imageSymbol: `https://images.pokemontcg.io/${id}/symbol.png`,
  imageLogo: `https://images.pokemontcg.io/${id}/logo.png`,
}));

function seedCard({
  id,
  name,
  type,
  setId,
  number,
  rarity,
  marketValue,
  trend = "up",
}: {
  id: string;
  name: string;
  type: string;
  setId: string;
  number: string;
  rarity: string;
  marketValue: number;
  trend?: "up" | "flat" | "down";
}): Card {
  const set = seedSets.find((entry) => entry.id === setId) ?? seedSets[0];
  const imageNumber = number.split("/")[0];
  const imageSmall = `https://images.pokemontcg.io/${setId}/${imageNumber}.png`;
  const imageLarge = `https://images.pokemontcg.io/${setId}/${imageNumber}_hires.png`;

  return {
    id,
    name,
    type,
    types: [type],
    setId,
    set: set.name,
    releaseDate: set.releaseDate,
    number,
    rarity,
    image: imageSmall,
    imageSmall,
    imageLarge,
    marketValue,
    pricing: {
      currency: "USD",
      source: "tcgplayer",
      selectedVariant: "holofoil",
      selectedPriceType: "market",
      variants: {
        holofoil: {
          low: Math.round(marketValue * 0.68 * 100) / 100,
          mid: Math.round(marketValue * 0.88 * 100) / 100,
          high: Math.round(marketValue * 1.3 * 100) / 100,
          market: marketValue,
        },
      },
    },
    tcgplayerPrices: {
      holofoil: {
        market: marketValue,
        mid: Math.round(marketValue * 0.88 * 100) / 100,
      },
    },
    flipScore: Math.max(55, Math.min(95, Math.round(62 + Math.min(marketValue, 1000) / 35))),
    trend,
    history: [
      { date: "Jan", value: Math.round(marketValue * 0.82 * 100) / 100 },
      { date: "Feb", value: Math.round(marketValue * 0.88 * 100) / 100 },
      { date: "Mar", value: Math.round(marketValue * 0.93 * 100) / 100 },
      { date: "Apr", value: Math.round(marketValue * 0.97 * 100) / 100 },
      { date: "May", value: marketValue },
    ],
    dataSource: "mock",
  };
}

export const seedCards: Card[] = [
  seedCard({ id: "base1-4", name: "Charizard", type: "Fire", setId: "base1", number: "4/102", rarity: "Rare Holo", marketValue: 920 }),
  seedCard({ id: "base1-2", name: "Blastoise", type: "Water", setId: "base1", number: "2/102", rarity: "Rare Holo", marketValue: 410, trend: "flat" }),
  seedCard({ id: "base1-15", name: "Venusaur", type: "Grass", setId: "base1", number: "15/102", rarity: "Rare Holo", marketValue: 325, trend: "down" }),
  seedCard({ id: "base1-10", name: "Mewtwo", type: "Psychic", setId: "base1", number: "10/102", rarity: "Rare Holo", marketValue: 280, trend: "flat" }),
  seedCard({ id: "base2-1", name: "Clefable", type: "Colorless", setId: "base2", number: "1/64", rarity: "Rare Holo", marketValue: 42 }),
  seedCard({ id: "base3-15", name: "Dragonite", type: "Colorless", setId: "base3", number: "15/62", rarity: "Rare Holo", marketValue: 165 }),
  seedCard({ id: "base5-4", name: "Dark Charizard", type: "Fire", setId: "base5", number: "4/82", rarity: "Rare Holo", marketValue: 285 }),
  seedCard({ id: "gym1-6", name: "Misty's Gyarados", type: "Water", setId: "gym1", number: "6/132", rarity: "Rare Holo", marketValue: 140 }),
  seedCard({ id: "gym2-2", name: "Blaine's Charizard", type: "Fire", setId: "gym2", number: "2/132", rarity: "Rare Holo", marketValue: 395 }),
  seedCard({ id: "neo1-9", name: "Lugia", type: "Psychic", setId: "neo1", number: "9/111", rarity: "Rare Holo", marketValue: 640 }),
  seedCard({ id: "neo1-17", name: "Typhlosion", type: "Fire", setId: "neo1", number: "17/111", rarity: "Rare Holo", marketValue: 350 }),
  seedCard({ id: "neo2-13", name: "Umbreon", type: "Darkness", setId: "neo2", number: "13/75", rarity: "Rare Holo", marketValue: 220 }),
  seedCard({ id: "neo3-65", name: "Shining Magikarp", type: "Water", setId: "neo3", number: "65/64", rarity: "Secret Rare", marketValue: 310 }),
  seedCard({ id: "neo4-107", name: "Shining Charizard", type: "Fire", setId: "neo4", number: "107/105", rarity: "Secret Rare", marketValue: 1050 }),
  seedCard({ id: "base6-3", name: "Charizard", type: "Fire", setId: "base6", number: "3/110", rarity: "Rare Holo", marketValue: 475 }),
  seedCard({ id: "ecard1-40", name: "Mew", type: "Psychic", setId: "ecard1", number: "40/165", rarity: "Rare Holo", marketValue: 180 }),
  seedCard({ id: "ecard2-H9", name: "Espeon", type: "Psychic", setId: "ecard2", number: "H9/147", rarity: "Rare Holo", marketValue: 520 }),
  seedCard({ id: "ecard3-146", name: "Rayquaza", type: "Colorless", setId: "ecard3", number: "146/144", rarity: "Rare Holo", marketValue: 1100 }),
  seedCard({ id: "ecard3-H1", name: "Alakazam", type: "Psychic", setId: "ecard3", number: "H1/H32", rarity: "Rare Holo", marketValue: 720, trend: "flat" }),
  seedCard({ id: "ex1-100", name: "Mewtwo ex", type: "Psychic", setId: "ex1", number: "100/109", rarity: "Rare Holo EX", marketValue: 185 }),
  seedCard({ id: "ex3-97", name: "Charizard ex", type: "Fire", setId: "ex3", number: "97/100", rarity: "Rare Holo EX", marketValue: 520 }),
  seedCard({ id: "ex8-107", name: "Rayquaza ex", type: "Colorless", setId: "ex8", number: "107/107", rarity: "Rare Holo EX", marketValue: 410 }),
  seedCard({ id: "dp1-3", name: "Dialga", type: "Metal", setId: "dp1", number: "3/130", rarity: "Rare Holo", marketValue: 28, trend: "flat" }),
  seedCard({ id: "hgss1-123", name: "Lugia LEGEND", type: "Water", setId: "hgss1", number: "123/123", rarity: "LEGEND", marketValue: 145 }),
  seedCard({ id: "bw1-113", name: "Reshiram", type: "Fire", setId: "bw1", number: "113/114", rarity: "Rare Ultra", marketValue: 62 }),
  seedCard({ id: "xy1-146", name: "Xerneas EX", type: "Fairy", setId: "xy1", number: "146/146", rarity: "Rare Ultra", marketValue: 35 }),
  seedCard({ id: "sm1-149", name: "Umbreon GX", type: "Darkness", setId: "sm1", number: "149/149", rarity: "Rare Ultra", marketValue: 88 }),
  seedCard({ id: "swsh3-20", name: "Charizard VMAX", type: "Fire", setId: "swsh3", number: "20/189", rarity: "Rare Holo VMAX", marketValue: 95 }),
  seedCard({ id: "swsh45sv-SV107", name: "Charizard VMAX", type: "Fire", setId: "swsh45sv", number: "SV107/SV122", rarity: "Rare Shiny VMAX", marketValue: 118 }),
  seedCard({ id: "swsh7-215", name: "Umbreon VMAX", type: "Darkness", setId: "swsh7", number: "215/203", rarity: "Rare Secret", marketValue: 890 }),
  seedCard({ id: "sv1-198", name: "Miriam", type: "Supporter", setId: "sv1", number: "198/198", rarity: "Special Illustration Rare", marketValue: 55 }),
];

export function getSeedCardsBySet(setId: string) {
  const set = seedSets.find((entry) => entry.id === setId);
  return seedCards.filter((card) => card.setId === setId || (set && card.set === set.name));
}
