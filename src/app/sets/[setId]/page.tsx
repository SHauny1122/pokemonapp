import { notFound } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import { SetCardsList } from "@/components/set-cards-list";
import { getCardsBySet, getSetById } from "@/lib/cards/card-service";

type SetDetailPageProps = {
  params: Promise<{ setId: string }>;
};

export default async function SetDetailPage({ params }: SetDetailPageProps) {
  const { setId } = await params;
  const set = await getSetById(setId);

  if (!set) {
    notFound();
  }

  const cards = await getCardsBySet(setId);

  return (
    <MobileShell title={set.name} subtitle={`${set.era} • ${set.releaseYear}`} showBackButton backFallbackHref="/sets">
      <section className="space-y-4">
        <article className="rounded-2xl border border-[#27272a] bg-[#15161a] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Set Summary</p>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-zinc-300">Total set size</span>
            <span className="text-white">{set.totalCards}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-zinc-300">Cards loaded</span>
            <span className="text-[#e1b54f]">{cards.length}</span>
          </div>
        </article>
        <SetCardsList cards={cards} />
      </section>
    </MobileShell>
  );
}
