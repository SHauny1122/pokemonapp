"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
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
  const { user } = useAuth();
  const { addCard, removeCard, getQuantity, isHydrated } = useCollection();
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);
  const quantity = getQuantity(cardId);

  const isGuest = !user;

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
        onClick={() => {
          if (isGuest) {
            setShowGuestPrompt(true);
            return;
          }

          addCard(cardId);
        }}
        className={`inline-flex w-full items-center justify-center rounded-xl bg-[#e1b54f] font-semibold text-[#141519] ${
          compact ? "px-2.5 py-2 text-xs" : "px-4 py-3 text-sm"
        }`}
      >
        {quantity > 0 ? "Add Another Copy" : "Add to Collection"}
      </button>

      {showGuestPrompt ? (
        <div className="rounded-xl border border-[#30323a] bg-[#11131a] p-3 text-xs text-zinc-300">
          <p className="text-zinc-200">Sign in to save cards to your portfolio and keep them linked to your account.</p>
          <div className="mt-2 flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-[#1d212a] px-2.5 py-1.5 font-medium text-white"
            >
              Sign In / Sign Up
            </Link>
            <button
              type="button"
              onClick={() => setShowGuestPrompt(false)}
              className="inline-flex items-center justify-center rounded-lg border border-[#35383f] bg-[#171a22] px-2.5 py-1.5 font-medium text-zinc-300"
            >
              Skip for now
            </button>
          </div>
        </div>
      ) : null}

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
