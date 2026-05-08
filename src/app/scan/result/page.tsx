"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CardCollectionActions } from "@/components/card-collection-actions";
import { useCurrency } from "@/components/currency-provider";
import { MobileShell } from "@/components/mobile-shell";
import { searchCardsMockSync } from "@/lib/cards/card-service";

function ScanResultContent() {
  const { formatUsd } = useCurrency();
  const searchParams = useSearchParams();
  const mockLatestScan = searchCardsMockSync("")[0];
  const confidenceRaw = Number(searchParams.get("confidence"));
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.max(0.45, Math.min(0.99, confidenceRaw))
    : 0.86;
  const confidencePercent = Math.round(confidence * 100);
  const isLowConfidence = confidencePercent < 75;

  if (!mockLatestScan) {
    return (
      <MobileShell
        title="Card Identified"
        subtitle="Review the result before adding to collection."
        showBackButton
        backFallbackHref="/scan"
      >
        <section className="rounded-2xl border border-dashed border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
          No mock scan result is available.
        </section>
      </MobileShell>
    );
  }

  return (
    <MobileShell
      title="Card Identified"
      subtitle="Review the result before adding to collection."
      showBackButton
      backFallbackHref="/scan"
    >
      <section className="rounded-2xl border border-[#27272a] bg-[#15161a] p-5">
        <p className="text-4xl">{mockLatestScan.image}</p>
        <h2 className="mt-3 text-xl font-semibold text-white">{mockLatestScan.name}</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {mockLatestScan.set} • {mockLatestScan.number} • {mockLatestScan.rarity}
        </p>

        <div className="mt-4 rounded-xl border border-[#343434] bg-[#101114] p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Scan Confidence</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm text-zinc-300">Match certainty</p>
            <p className={`text-sm font-semibold ${isLowConfidence ? "text-amber-300" : "text-emerald-300"}`}>
              {confidencePercent}%
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#232323]">
            <div
              className={`h-full rounded-full ${isLowConfidence ? "bg-amber-400" : "bg-emerald-400"}`}
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            {isLowConfidence
              ? "Confidence is low. Verify before saving to collection."
              : "Confidence looks strong. You can safely continue with this card."}
          </p>
        </div>

        {isLowConfidence ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link
              href="/scan"
              className="inline-flex items-center justify-center rounded-xl border border-[#3d3d3d] bg-[#191b1f] px-3 py-3 text-sm font-medium text-white"
            >
              Try Again
            </Link>
            <Link
              href="/search"
              className="inline-flex items-center justify-center rounded-xl border border-[#3d3d3d] bg-[#191b1f] px-3 py-3 text-sm font-medium text-white"
            >
              Search Manually
            </Link>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-[#292929] bg-[#101114] p-3">
            <p className="text-zinc-400">Market Value</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {mockLatestScan.marketValue !== null ? formatUsd(mockLatestScan.marketValue) : "Price unavailable"}
            </p>
          </div>
          <div className="rounded-xl border border-[#292929] bg-[#101114] p-3">
            <p className="text-zinc-400">Flip Score</p>
            <p className="mt-1 text-lg font-semibold text-[#e1b54f]">{mockLatestScan.flipScore}/100</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <p className="text-center text-xs text-zinc-400">Save first, then continue to detail or deal check.</p>
          <CardCollectionActions cardId={mockLatestScan.id} />
          <Link
            href={`/cards/${mockLatestScan.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-4 py-3 text-sm font-medium text-white"
          >
            Open Card Detail
          </Link>
          <Link
            href={`/deal-check?cardId=${mockLatestScan.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-[#353535] bg-[#191b1f] px-4 py-3 text-sm font-medium text-white"
          >
            Run Deal Check
          </Link>
        </div>
      </section>
    </MobileShell>
  );
}

export default function ScanResultPage() {
  return (
    <Suspense
      fallback={
        <MobileShell
          title="Card Identified"
          subtitle="Review the result before adding to collection."
          showBackButton
          backFallbackHref="/scan"
        >
          <section className="rounded-2xl border border-[#3a3a3a] bg-[#141519] p-4 text-sm text-zinc-400">
            Loading scan result...
          </section>
        </MobileShell>
      }
    >
      <ScanResultContent />
    </Suspense>
  );
}
