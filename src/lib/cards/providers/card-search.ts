export function buildPokemonCardSearchQuery(input: string) {
  const query = input.trim();

  if (!query) {
    return "";
  }

  return `name:*${query}* OR set.name:*${query}* OR number:*${query}* OR rarity:*${query}* OR types:*${query}*`;
}
