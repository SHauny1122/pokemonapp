import Link from "next/link";
import { MobileShell } from "@/components/mobile-shell";
import { getCardsBySet, getSets } from "@/lib/cards/card-service";

export default async function SetsPage() {
  const sets = await getSets();
  const setCardsCounts = await Promise.all(
    sets.map(async (set) => {
      const setCards = await getCardsBySet(set.id);
      return {
        setId: set.id,
        count: setCards.length,
      };
    })
  );

  const countBySetId = new Map(setCardsCounts.map((entry) => [entry.setId, entry.count]));

  return (
    <MobileShell title="Browse Sets" subtitle="Explore cards by set and era." showBackButton backFallbackHref="/search">
      <section className="space-y-3">
        <article className="rounded-2xl border border-[#27272a] bg-[#15161a] p-4 text-sm text-zinc-400">
          Tap any set to open its card list, then open a card for value, Flip Score, and actions.
        </article>

        {sets.map((set) => {
          const setCardsCount = countBySetId.get(set.id) ?? 0;

          return (
            <Link
              key={set.id}
              href={`/sets/${set.id}`}
              className="block rounded-2xl border border-[#292929] bg-[#15161a] px-4 py-4"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                {set.icon} {set.era}
              </p>
              <h2 className="mt-1 text-base font-semibold text-white">{set.name}</h2>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-zinc-400">Released {set.releaseYear}</span>
                <span className="text-[#e1b54f]">{setCardsCount} cards loaded</span>
              </div>
            </Link>
          );
        })}
      </section>
    </MobileShell>
  );
}
