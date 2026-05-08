"use client";

import { useCollection } from "@/components/collection-provider";

type CardCollectionActionsProps = {
  cardId: string;
  compact?: boolean;
  showHelperText?: boolean;
};

export function CardCollectionActions({
  cardId,
  compact = false,
  showHelperText = true,
}: CardCollectionActionsProps) {
  const { addCard, removeCard, getQuantity, isHydrated } = useCollection();
  const quantity = getQuantity(cardId);

  if (!isHydrated) {
    return (
      <div className="rounded-xl border border-[#2a2a2a] bg-[#15161a] px-3 py-2 text-center text-xs text-zinc-500">
        Loading collection...
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {showHelperText && quantity > 0 ? (
        <p className="text-center text-xs text-zinc-400">
          In collection: <span className="text-zinc-200">{quantity}</span>
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => addCard(cardId)}
        className={`inline-flex w-full items-center justify-center rounded-xl bg-[#e1b54f] font-semibold text-[#141519] ${
          compact ? "px-2.5 py-2 text-xs" : "px-4 py-3 text-sm"
        }`}
      >
        {quantity > 0 ? "Add Another Copy" : "Add to Collection"}
      </button>

      {quantity > 0 ? (
        <button
          type="button"
          onClick={() => removeCard(cardId)}
          className={`inline-flex w-full items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] font-medium text-white ${
            compact ? "px-2.5 py-2 text-xs" : "px-4 py-3 text-sm"
          }`}
        >
          Remove One
        </button>
      ) : null}
    </div>
  );
}
