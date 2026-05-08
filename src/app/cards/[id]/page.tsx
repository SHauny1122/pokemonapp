import { notFound } from "next/navigation";
import { CardDetailContent } from "@/components/card-detail-content";
import { MobileShell } from "@/components/mobile-shell";
import { getCardById } from "@/lib/cards/card-service";

type CardDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function CardDetailPage({ params }: CardDetailPageProps) {
  const { id } = await params;
  const card = await getCardById(id);

  if (!card) {
    notFound();
  }

  return (
    <MobileShell title={card.name} subtitle={`${card.set} • ${card.number}`} showBackButton backFallbackHref="/search">
      <CardDetailContent card={card} />
    </MobileShell>
  );
}
