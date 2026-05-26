"use client";

import { useState } from "react";
import { useCurrency } from "@/components/currency-provider";

type CurrencySelectorProps = {
  compact?: boolean;
};

export function CurrencySelector({ compact = false }: CurrencySelectorProps) {
  const { selectedCurrency, selectedCurrencyCode, supportedCurrencies, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-[#262a31] bg-[#11141a] text-zinc-100 ${
          compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs"
        }`}
      >
        <span>{selectedCurrency.flag}</span>
        <span className="font-semibold">{selectedCurrencyCode}</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close currency picker"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60"
          />

          <div className="absolute inset-x-3 bottom-6 mx-auto w-full max-w-md rounded-2xl border border-[#272b32] bg-[#101216] p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">Country + Currency</p>
            <p className="mt-1 text-sm text-zinc-300">Select your display currency. Base prices remain USD.</p>

            <div className="mt-3 space-y-2">
              {supportedCurrencies.map((currency) => {
                const active = currency.code === selectedCurrencyCode;

                return (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => {
                      setCurrency(currency.code);
                      setIsOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                      active
                        ? "border-[#2f455f] bg-[#131b26] text-[#7dd3fc]"
                        : "border-[#2f3138] bg-[#101217] text-zinc-200"
                    }`}
                  >
                    <span className="text-sm">
                      {currency.flag} {currency.country}
                    </span>
                    <span className="text-xs font-semibold">{currency.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
