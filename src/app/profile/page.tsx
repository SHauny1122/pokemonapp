"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCollection } from "@/components/collection-provider";
import { useCurrency } from "@/components/currency-provider";
import { CurrencySelector } from "@/components/currency-selector";
import { MobileShell } from "@/components/mobile-shell";

export default function ProfilePage() {
  const { totalCards, totalValue, isHydrated } = useCollection();
  const { formatUsd, selectedCurrency } = useCurrency();
  const { user, profile, signOut, isLoading, isSupabaseConfigured, refreshSession } = useAuth();
  const hasRequestedRefreshRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured || isLoading || user || hasRequestedRefreshRef.current) {
      return;
    }

    hasRequestedRefreshRef.current = true;
    void refreshSession();
  }, [isLoading, isSupabaseConfigured, refreshSession, user]);

  return (
    <MobileShell title="Profile" subtitle="Private collector dashboard.">
      <section className="space-y-4">
        <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#3a3b41] bg-[#1b1c21] text-lg">
                🧢
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Collector Profile</p>
                <p className="text-xs text-zinc-400">
                  {isLoading ? "Checking account..." : user?.email ?? "Email not connected yet"}
                </p>
              </div>
            </div>
            {user ? (
              <button
                type="button"
                onClick={() => {
                  void signOut();
                }}
                className="rounded-lg border border-[#35363d] bg-[#1b1c22] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200"
              >
                Log Out
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-lg border border-[#35363d] bg-[#1b1c22] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200"
              >
                Log In
              </Link>
            )}
          </div>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#32343c] bg-[#101217] px-2.5 py-1 text-xs text-zinc-300">
            <span>{selectedCurrency.flag}</span>
            <span>{selectedCurrency.country}</span>
            <span className="text-zinc-500">•</span>
            <span className="font-semibold">{selectedCurrency.code}</span>
          </div>

          {!isSupabaseConfigured ? (
            <p className="mt-2 text-xs text-amber-200">
              Add Supabase env vars to enable account sync across devices.
            </p>
          ) : null}
        </article>

        <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Subscription</p>
          {user ? (
            <>
              <div className="mt-2 rounded-xl border border-[#30323a] bg-[#11131a] p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Current plan</span>
                  <span className="font-semibold text-white">{profile?.plan ?? "Free"}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className="font-semibold text-white">{profile?.subscription_status ?? "Inactive"}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-zinc-400">Billing period</span>
                  <span className="font-semibold text-white">{profile?.subscription_period ?? "Not set"}</span>
                </div>
              </div>
              <Link
                href="/subscription"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[#e1b54f] px-4 py-3 text-sm font-semibold text-[#141519]"
              >
                Upgrade
              </Link>
            </>
          ) : (
            <div className="mt-2 rounded-xl border border-dashed border-[#3a3b42] bg-[#11131a] p-3 text-sm text-zinc-300">
              <p>Create an account to sync your collection and manage subscription.</p>
              <Link href="/login" className="mt-2 inline-flex text-sm text-[#e1b54f]">
                Create account / Log in
              </Link>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Collection Stats</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-[#30323a] bg-[#11131a] p-3">
              <p className="text-zinc-400">Total Cards</p>
              <p className="mt-1 text-lg font-semibold text-white">{isHydrated ? totalCards : 0}</p>
            </div>
            <div className="rounded-xl border border-[#30323a] bg-[#11131a] p-3">
              <p className="text-zinc-400">Collection Value</p>
              <p className="mt-1 text-lg font-semibold text-white">{isHydrated ? formatUsd(totalValue) : "..."}</p>
            </div>
            <div className="rounded-xl border border-[#30323a] bg-[#11131a] p-3">
              <p className="text-zinc-400">Sealed Items</p>
              <p className="mt-1 text-lg font-semibold text-white">0</p>
            </div>
            <div className="rounded-xl border border-[#30323a] bg-[#11131a] p-3">
              <p className="text-zinc-400">Graded Cards</p>
              <p className="mt-1 text-lg font-semibold text-white">0</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Performance</p>
          <div className="mt-3 rounded-xl border border-dashed border-[#3a3b42] bg-[#11131a] p-4 text-sm text-zinc-400">
            <p className="text-zinc-200">Performance tracking is ready once purchase prices are added.</p>
            <p className="mt-1">You will see Total Paid, Market Value, Gain/Loss, and Gain/Loss % here.</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl border border-[#30323a] bg-[#11131a] p-3">
              <p className="text-zinc-400">Total Paid</p>
              <p className="mt-1 text-lg font-semibold text-white">—</p>
            </div>
            <div className="rounded-xl border border-[#30323a] bg-[#11131a] p-3">
              <p className="text-zinc-400">Current Market Value</p>
              <p className="mt-1 text-lg font-semibold text-white">{isHydrated ? formatUsd(totalValue) : "..."}</p>
            </div>
            <div className="rounded-xl border border-[#30323a] bg-[#11131a] p-3">
              <p className="text-zinc-400">Gain / Loss</p>
              <p className="mt-1 text-lg font-semibold text-white">—</p>
            </div>
            <div className="rounded-xl border border-[#30323a] bg-[#11131a] p-3">
              <p className="text-zinc-400">Gain / Loss %</p>
              <p className="mt-1 text-lg font-semibold text-white">—</p>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-[#2a2b2f] bg-[#15171b] p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Settings</p>
          <div className="mt-3 space-y-2">
            <Link
              href="/subscription"
              className="flex items-center justify-between rounded-xl border border-[#30323a] bg-[#11131a] px-3 py-3 text-sm text-white"
            >
              <span>Subscription / Pro</span>
              <span className="text-zinc-500">›</span>
            </Link>

            <div className="flex items-center justify-between rounded-xl border border-[#30323a] bg-[#11131a] px-3 py-2.5 text-sm text-white">
              <span>Currency &amp; Country</span>
              <CurrencySelector compact />
            </div>

            <button type="button" className="flex w-full items-center justify-between rounded-xl border border-[#30323a] bg-[#11131a] px-3 py-3 text-sm text-white">
              <span>Data / Backup (Coming Soon)</span>
              <span className="text-zinc-500">›</span>
            </button>
            <button type="button" className="flex w-full items-center justify-between rounded-xl border border-[#30323a] bg-[#11131a] px-3 py-3 text-sm text-white">
              <span>Privacy (Coming Soon)</span>
              <span className="text-zinc-500">›</span>
            </button>
            <button type="button" className="flex w-full items-center justify-between rounded-xl border border-[#30323a] bg-[#11131a] px-3 py-3 text-sm text-white">
              <span>Help / Support (Coming Soon)</span>
              <span className="text-zinc-500">›</span>
            </button>
          </div>
        </article>

        <article className="rounded-2xl border border-dashed border-[#3a3b42] bg-[#13161d] p-4">
          <p className="text-sm text-zinc-200">Your profile is private by default.</p>
          <p className="mt-1 text-xs text-zinc-400">Sharing options can be added later when you choose.</p>
        </article>
      </section>
    </MobileShell>
  );
}
