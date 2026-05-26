export function buildPokemonCardSearchQuery(input: string) {
  const query = input.trim();

  if (!query) {
    return "";
  }

  const trailingNumberMatch = query.match(/^(.*\S)\s+([a-z0-9-]+)$/i);

  if (trailingNumberMatch) {
    const [, namePart, numberPart] = trailingNumberMatch;

    return `name:*${namePart}* number:*${numberPart}*`;
  }

  return `name:*${query}* OR set.name:*${query}* OR number:*${query}* OR rarity:*${query}* OR types:*${query}*`;
}
